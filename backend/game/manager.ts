import { BorisDatabase } from "../db/db";
import { Game, scenarioFromDbScenario } from "../db/models";
import { Scenario } from "../../common/models";
import { GameVar, GameVarScope } from "./vars";

interface GameManagerInitData {
    db: BorisDatabase;
    game: Game;
    teamVars: any;
}

export class GameManager {
    private readonly db: BorisDatabase;
    readonly gameId: number;
    readonly teamId: number;
    gameVars: any;
    pendingTeamVars: any; // team vars that will be saved to the team.game_vars when the game is completed.
    readonly teamVars: any;
    readonly steps: Map<number, {}>;

    constructor(data: GameManagerInitData) {
        this.db = data.db;
        this.gameId = data.game.id;
        this.teamId = data.game.team_id;
        this.gameVars = data.game.game_vars;
        this.teamVars = data.teamVars;
        this.pendingTeamVars = data.game.pending_team_vars;
    }

    static async loadGame(db: BorisDatabase, gameId: number): Promise<GameManager> {
        const game = await db.games.findOne(gameId);
        if (game === null) {
            throw new Error(`Game ${gameId} not found.`);
        }
        if (!game.is_active) {
            throw new Error(`Game ${gameId} is not active.`)
        }
        if (game.finished !== null) {
            throw new Error(`Game ${gameId} is active but finished - shouldn't happen.`)
        }

        //const scenario = scenarioFromDbScenario(await db.scenarios.findOne(game.scenario_id));

        const team = await db.teams.findOne(game.team_id);

        return new GameManager({
            db,
            game,
            teamVars: team.game_vars,
        });
    }

    public getVar<T>(variable: Readonly<GameVar<T>>, stepId?: number): T {
        if (variable.scope === GameVarScope.Step) {
            if (stepId === undefined) {
                throw new Error('Must specify stepId to set a step-scoped variable.');
            }
            const newVariable: Readonly<GameVar<T>> = {...variable, key: `step${stepId}:${variable.key}`};
            return this._getGameVar(newVariable);
        } else if (variable.scope === GameVarScope.Game) {
            return this._getGameVar(variable);
        } else if (variable.scope === GameVarScope.Team) {
            return this._getTeamVar(variable);
        }
    }
    public async setVar<T>(variable: Readonly<GameVar<T>>, updater: (value: T) => T, stepId?: number): Promise<T> {
        if (variable.scope === GameVarScope.Step) {
            if (stepId === undefined) {
                throw new Error('Must specify stepId to set a step-scoped variable.');
            }
            const newVariable: Readonly<GameVar<T>> = {...variable, key: `step${stepId}:${variable.key}`};
            return this._setGameVar(newVariable, updater);
        } else if (variable.scope === GameVarScope.Game) {
            return this._setGameVar(variable, updater);
        } else if (variable.scope === GameVarScope.Team) {
            return this._setTeamVar(variable, updater);
        }
    }
    private _getGameVar<T>(variable: Readonly<GameVar<T>>): T {
        if (variable.key in this.gameVars) {
            return this.gameVars[variable.key];
        }
        return variable.default;
    }
    private async _setGameVar<T>(variable: Readonly<GameVar<T>>, updater: (value: T) => T) {
        return await this.db.instance.tx('update_game_var', async (task) => {
            // Acquire a row-level lock on the row we're about to update, then call the updater
            // method, then save the result. This enables atomic increments, etc.
            const origData = await task.one('SELECT game_vars FROM games WHERE id = $1 FOR UPDATE', [this.gameId]);
            const origValue: T = variable.key in origData.game_vars ? origData.game_vars[variable.key] : variable.default;
            const newValue = updater(origValue);
            const forceCast = typeof newValue === 'string' ? '::text' : ''; // to_jsonb() needs to know how to interpret a string type.
            const result = await task.one(
                // use jsonb_set to guarantee that we don't affect other variables
                `UPDATE games SET game_vars = jsonb_set(game_vars, $2, to_jsonb($3${forceCast}))
                WHERE id = $1 RETURNING game_vars;`,
                [this.gameId, `{${variable.key}}`, newValue]
            );
            this.gameVars = result.game_vars;
            return newValue;
        });
    }
    private _getTeamVar<T>(variable: Readonly<GameVar<T>>): T {
        if (variable.key in this.pendingTeamVars) {
            return this.pendingTeamVars[variable.key];
        } else if (variable.key in this.teamVars) {
            return this.teamVars[variable.key];
        } else {
            return variable.default;
        }
    }
    private async _setTeamVar<T>(variable: Readonly<GameVar<T>>, updater: (value: T) => T) {
        return this.db.instance.tx('update_team_var', async (task) => {
            // Acquire a row-level lock on the row we're about to update, then call the updater
            // method, then save the result. This enables atomic increments, etc.
            const origData = await task.one('SELECT pending_team_vars FROM games WHERE id = $1 FOR UPDATE', [this.gameId]);
            const origValue: T = (
                variable.key in origData.pending_team_vars ? origData.pending_team_vars[variable.key] :
                variable.key in this.teamVars ? this.teamVars[variable.key] :
                variable.default
            );
            const newValue = updater(origValue);
            const forceCast = typeof newValue === 'string' ? '::text' : ''; // to_jsonb() needs to know how to interpret a string type.
            const result = await task.one(
                // use jsonb_set to guarantee that we don't affect other variables
                `UPDATE games SET pending_team_vars = jsonb_set(pending_team_vars, $2, to_jsonb($3${forceCast}))
                WHERE id = $1 RETURNING pending_team_vars;`,
                [this.gameId, `{${variable.key}}`, newValue]
            );
            this.pendingTeamVars = result.pending_team_vars;
            return newValue;
        });
    }
    /**
     * Mark this game as abandoned.
     * Discard any pending changes to the team vars (like # of saltines earned).
     */
    public async abandon() {
        await this.db.games.update({id: this.gameId}, {is_active: false});
    }
    /**
     * Mark this game as successfully finished.
     * Save any pending changes to the team vars (like # of saltines earned).
     */
    public async finish() {
        // Mark the game as finished, but check that it wasn't already finished or abandoned
        return this.db.instance.tx('update_team_var', async (task) => {
            let result: any;
            await task.none('START TRANSACTION');
            try {
                result = await task.one(
                    `UPDATE games SET finished = NOW(), is_active = FALSE WHERE id = $1 AND is_active = TRUE RETURNING pending_team_vars`,
                    [this.gameId]
                );
            } catch (err) {
                await task.none('ROLLBACK');
                throw new Error("Game was not active.");
            }
            const pendingTeamVars = result.pending_team_vars;
            // Always fetch the latest team vars from the DB in this transaction instead of trusting this.teamVars:
            const oldTeamVars = (await task.one('SELECT game_vars FROM teams WHERE id = $1', [this.teamId])).game_vars;
            const combinedTeamVars = {...oldTeamVars, ...pendingTeamVars};
            await task.none(
                `UPDATE teams SET game_vars = $2 WHERE id = $1`,
                [this.teamId, combinedTeamVars]
            );
            await task.none('COMMIT');
        });
    }
}
