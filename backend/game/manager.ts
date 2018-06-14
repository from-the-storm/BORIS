import { app } from "../backend-app";
import { BorisDatabase } from "../db/db";
import { Game, scenarioFromDbScenario } from "../db/models";
import { Scenario } from "../../common/models";
import { GameVar, GameVarScope } from "./vars";
import { Step } from "./step";
import { AnyUiState } from "../../common/game";
import { publishEvent } from "../websocket/pub-sub";
import { GameUiChangedNotification, NotificationType } from "../../common/notifications";
import { loadScriptFile } from "./script-loader";

/** External services that the GameManager needs to run */
interface GameManagerContext {
    db: BorisDatabase;
    publishEvent: typeof publishEvent;
}

interface GameManagerInitData {
    context: GameManagerContext;
    game: Game;
    teamVars: any;
    scriptSteps: any[];
}

const currentStepVar: GameVar<number> = {key: 'step#', scope: GameVarScope.Game, default: -1};
// Next UI update sequence ID. This is incremented and sent with any UI update
// so that clients can ensure the UI update sequence has continuous IDs in order
// to know that they didn't miss any updates.
const lastUiUpdateSeqId: GameVar<number> = {key: 'ui_seq', scope: GameVarScope.Game, default: 0};

/**
 * Instances of GameManager, one cached per game.
 * Always access GameManager via GameManager.loadGame()
 * 
 * Uses a promise as a form of locking when initializing a new one.
 */
const gameManagerCache = new Map<number, Promise<GameManager>>();

export class GameManager {
    private readonly db: BorisDatabase;
    readonly gameId: number;
    readonly teamId: number;
    gameVars: any;
    pendingTeamVars: any; // team vars that will be saved to the team.game_vars when the game is completed.
    readonly teamVars: any;
    readonly steps: ReadonlyMap<number, Step>;

    private constructor(data: GameManagerInitData) {
        this.db = data.context.db;
        this.gameId = data.game.id;
        this.teamId = data.game.team_id;
        this.gameVars = data.game.game_vars;
        this.teamVars = data.teamVars;
        this.pendingTeamVars = data.game.pending_team_vars;
        // Load the steps:
        const steps = new Map<number, Step>();
        data.scriptSteps.forEach((val, idx) => {
            const stepId: number = idx * 10; // For now use index*10; in the future, these IDs may be database row IDs etc.
            const step = Step.loadFromData(val, stepId, this);
            steps.set(stepId, step);
        });
        this.steps = steps;
        // Since this GameManager is only initialized once per game,
        // we are either starting a new game or the server has restarted
        // while this game was active. In either case, run the current step:
        this.currentStep.run();
    }

    get currentStep(): Step {
        const currentStepId = this.getVar(currentStepVar);
        if (currentStepId === -1) {
            // Return the first step, whatever it is:
            return this.steps.values().next().value;
        }
        return this.steps.get(currentStepId);
    }

    public getUiState(): AnyUiState[] {
        const uiState: AnyUiState[] = [];
        const currentStepId = this.currentStep.id;
        for (const step of this.steps.values()) {
            uiState.push(step.getUiState());
            if (step.id === currentStepId) {
                break; // Don't bother returning a whole bunch of 'null' values beyond the current step.
            }
        }
        return uiState;
    }

    /**
     * Steps are primarily keyed by their numeric ID, but sometimes (e.g. for UI)
     * updates, we want to know their index in the flattened list of steps.
     * @param stepId 
     */
    private getStepIndex(stepId: number): number {
        let stepIndex: number;
        let i = 0;
        for (const step of this.steps.values()) {
            if (step.id === stepId) {
                stepIndex = i;
                break;
            }
            i++;
        }
        if (stepIndex === undefined) {
            throw new Error(`Step with ID ${stepId} not found in GameManager's step list.`);
        }
        return stepIndex;
    }

    public async pushUiUpdate(stepId: number) {
        // Find the index of the step
        const stepIndex = this.getStepIndex(stepId);
        const step = this.steps.get(stepId);
        console.log(`Notifying players that step ${stepIndex} has changed its UI.`);
        // Generate an ID for this notification
        const uiUpdateSeqId: number = await this.setVar(lastUiUpdateSeqId, oldVal => oldVal + 1);
        // Push out a websocket notification:
        const event: GameUiChangedNotification = {
            type: NotificationType.GAME_UI_UPDATE,
            uiUpdateSeqId,
            stepIndex,
            newStepUi: step.getUiState(),
        };
        publishEvent(this.teamId, event);
    }

    /**
     * Get the UI update sequence ID. This number is incremented with every UI update
     * notification that gets sent out. Any client that processes events should refresh
     * the whole UI state if the sequence is ever discontinuous, since that means some
     * updates were lost.
     */
    public get uiUpdateSeqId(): number {
        return this.getVar(lastUiUpdateSeqId);
    }

    /**
     * Advance to the next step, or mark the game as complete if we're already
     * on the last step.
     */
    public async advanceToNextstep() {
        const currentStepId = this.currentStep.id;
        // Figure out the ID of the step after the current one:
        let found = false;
        for (const step of this.steps.values()) {
            if (found) {
                // The previous step was the current step, so this is the next step:
                await this.setVar(currentStepVar, () => step.id);
                // And run the next step:
                this.steps.get(step.id).run();
                return;
            } else if (step.id === currentStepId) {
                found = true;
            }
        }
        // If we get here, we must be at/past the last step. So end the game:
        await this.finish();
    }

    static async loadGame(gameId: number, context?: GameManagerContext): Promise<GameManager> {
        // Check if the GameManager is already loaded in gameManagerCache
        // If it is, return it. If not, initialize a new one.
        // Everything is wrapped in promises to avoid issues if this method were to
        // get called again with the same gameId before a GameManager has finished loading.
        const cachedGM = gameManagerCache.get(gameId)
        if (cachedGM !== undefined) {
            try {
                return await cachedGM;
            } catch (err) {
                // The promise to retrieve the cached GameManager failed. We'll need to try creating a new one.
            }
        }
        // 
        if (context === undefined) {
            context = {
                db: app.get('db'),
                publishEvent: publishEvent,
            }
        }
        const newGameManagerPromise = (async () => {
            const game = await context.db.games.findOne(gameId);
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
            const scriptSteps = await loadScriptFile('dev-script'); // TODO: let the scenario specify the script

            const team = await context.db.teams.findOne(game.team_id);

            return new GameManager({context, game, teamVars: team.game_vars, scriptSteps});
        })();
        gameManagerCache.set(gameId, newGameManagerPromise);
        return await newGameManagerPromise;
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
