import { BorisDatabase } from "../db/db";
import { Game, scenarioFromDbScenario } from "../db/models";
import { Scenario } from "../../common/models";
import { GameVar, GameVarScope } from "./vars";

interface GameManagerInitData {
    game: Game;
    teamVars: any;
}

export class GameManager {
    readonly gameId: number;
    readonly teamId: number;
    gameVars: any;
    pendingTeamVars: any; // team vars that will be saved to the team.game_vars when the game is completed.
    readonly teamVars: any;
    readonly steps: Map<number, {}>;

    constructor(data: GameManagerInitData) {
        this.gameId = data.game.id;
        this.teamId = data.game.team_id;
        this.gameVars = data.game.game_vars;
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
            game,
            teamVars: team.game_vars,
        });
    }

    public getVar<T>(variable: Readonly<GameVar<T>>, stepId: number): T {
        if (variable.scope === GameVarScope.Step) {
            const newVariable: Readonly<GameVar<T>> = {...variable, key: `step${stepId}:${variable.key}`};
            return this._getGameVar(newVariable);
        } else if (variable.scope === GameVarScope.Game) {
            return this._getGameVar(variable);
        } else if (variable.scope === GameVarScope.Team) {
            return this._getTeamVar(variable);
        }
    }
    private _getGameVar<T>(variable: Readonly<GameVar<T>>): T {
        if (variable.key in this.gameVars) {
            return this.gameVars[variable.key];
        }
        return variable.default;
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
}
