import * as JsInterpreter from "js-interpreter";
import { BorisDatabase, getDB } from "../db/db";
import { Game } from "../db/models";
import { GameVar, GameVarScope } from "./vars";
import { Step } from "./step";
import { loadStepFromData } from "./steps/loader";
import { AnyUiState } from "../../common/game";
import { publishEventToUsers } from "../websocket/pub-sub";
import { GameUiChangedNotification, NotificationType } from "../../common/notifications";
import { loadScriptFile } from "./script-loader";
import { SafeError } from "../routes/api-utils";
import { GameStatus, StepResponseRequest } from "../../common/api";
import { getPlayerIdWithRole } from "./steps/assign-roles";

/** External services that the GameManager needs to run */
interface GameManagerContext {
    db: BorisDatabase;
    publishEventToUsers: typeof publishEventToUsers;
}

interface GameManagerInitData {
    context: GameManagerContext;
    game: Game;
    players: {id: number}[];
    teamVars: any;
    scriptSteps: any[];
}

const EndOfScript = Symbol();

/**
 * Instances of GameManager, one cached per game.
 * Always access GameManager via GameManager.loadGame()
 * 
 * Uses a promise as a form of locking when initializing a new one.
 */
const gameManagerCache = new Map<number, Promise<GameManager>>();

/** 
 * The interface for GameManager that is used by Step subclasses.
 * We define an interface so we can mock it for tests, and to ensure
 * steps only call a limited API.
 **/
export interface GameManagerStepInterface {
    pushUiUpdate(stepId: number): Promise<void>;
    getVar<T>(variable: Readonly<GameVar<T>>, stepId?: number): T;
    setVar<T>(variable: Readonly<GameVar<T>>, updater: (value: T) => T, stepId?: number): Promise<T>;
    readonly playerIds: number[];
    readonly gameActive: boolean;
}

export class GameManager implements GameManagerStepInterface {
    private readonly db: BorisDatabase;
    private readonly publishEventToUsers: typeof publishEventToUsers;
    /** If the game is completed or abandoned, this gets set to false. Read it publicly as 'gameActive'. */
    private _gameActive: boolean;
    readonly gameId: number;
    readonly teamId: number;
    readonly playerIds: number[];
    gameVars: any;
    pendingTeamVars: any; // team vars that will be saved to the team.game_vars when the game is completed.
    readonly teamVars: any;
    /** List of all the possible steps in this script, in order and also keyed by ID */
    readonly steps: ReadonlyMap<number, Step>;
    /**
     * UI update sequence IDs. This number (for eahc user) is incremented with every UI
     * updatenotification that gets sent out. Any client that processes events should
     * refresh the whole UI state if the sequence is ever discontinuous, since that
     * means some updates were lost.
     * We don't store it in the DB since it's not a big deal if it gets lost on server
     * restart etc.
     */
    lastUiUpdateSeqIdsByUserId: {[userId: number]: number};
    /**
     * For any step seen by any user, we call run() once per game.
     * It only runs once, regardless when it is seen nor by how
     * many users. It may be long-running. Once a step is run,
     * its run() method returns a promise that gets added to this
     * map.
     */
    stepRunPromisesByStepId: Map<number, Promise<void>>;
    /**
     * We don't want to run two separate instances of this.advanceUsersToNextStep()
     * simultaneously, nor do we want to terminate the game while it's running,
     * so this promise is used to avoid that by being unresolved while
     * advanceUsersToNextStep() runs.
     */
    _updateInProgressPromise: Promise<void>;

    private constructor(data: GameManagerInitData) {
        this.db = data.context.db;
        this.publishEventToUsers = data.context.publishEventToUsers;
        this._gameActive = true;
        this.gameId = data.game.id;
        this.teamId = data.game.team_id;
        this.playerIds = data.players.map(entry => entry.id);
        this.lastUiUpdateSeqIdsByUserId = {};
        this.playerIds.forEach(userId => { this.lastUiUpdateSeqIdsByUserId[userId] = 0; });
        this.gameVars = data.game.game_vars;
        this.teamVars = data.teamVars;
        this.pendingTeamVars = data.game.pending_team_vars;
        // Load the steps:
        const steps = new Map<number, Step>();
        data.scriptSteps.forEach((val, idx) => {
            const stepId: number = idx * 10; // For now use index*10; in the future, these IDs may be database row IDs etc.
            const step = loadStepFromData(val, stepId, this);
            steps.set(stepId, step);
        });
        this.steps = steps;
        this.stepRunPromisesByStepId = new Map();
        this._updateInProgressPromise = new Promise(resolve => { resolve(); });
        // Since this GameManager is only initialized once per game,
        // we are either starting a new game or the server has restarted
        // while this game was active. In either case, run the current step:
        this.advanceUsersToNextStep().then(() => {
            this.runCurrentSteps();
            // Normally advanceUsersToNextStep() calls runCurrentSteps(), but we must explicitly call it
            // in the case where the server was restarted and we're resuming a game in progress, because
            // advanceUsersToNextStep() will only call runCurrentSteps() if it changed the current step
            // for any user.
        });
    }

    get gameActive() { return this._gameActive; }

    private getCurrentStepForUser(userId: number): Step|undefined {
        const stepsSeen = this.getStepsSeenByUser(userId);
        if (stepsSeen.length === 0) {
            return undefined;
        }
        const currentStepId = stepsSeen[stepsSeen.length - 1];
        return this.steps.get(currentStepId);
    }

    /**
     * Call the run() method of any steps that any users are currently
     * on whose run() method has never been called.
     *
     * This is not an async function because run() may take
     * many minutes (or even longer) to complete, by design,
     * so we don't want the caller to ever await this result.
     */
    private runCurrentSteps() {
        const activeStepIds: Set<number> = new Set();
        this.playerIds.forEach(userId => { activeStepIds.add(this.getCurrentStepForUser(userId).id); });

        for (const stepId of activeStepIds) {
            if (this.stepRunPromisesByStepId.get(stepId) === undefined) {
                const step = this.steps.get(stepId);
                this.stepRunPromisesByStepId.set(stepId, step.run().then(() => {
                    if (step.isComplete && this._gameActive) {
                        this.advanceUsersToNextStep(); // We don't need to wait for this result though.
                    }
                }, () => {
                    // The step failed to run.
                    if (this.gameActive) {
                        console.error(`Unable to finish running step ${stepId}`);
                    }
                }));
                // And push a UI update for this step:
                if (step.getUiState() !== null) {
                    this.pushUiUpdate(step.id);
                }
            }
        }
    }

    /**
     * Given a step ID, this returns the IDs of any user on that step.
     * Each user is always currently viewing one particular step
     * (though their UI will also show all the pervious steps they've seen).
     * @param stepId 
     */
    private getUserIdsWhoAreOnStep(stepId: number): number[] {
        const usersOnStep: number[] = [];
        for (const userId of this.playerIds) {
            const stepsSeen = this.getStepsSeenByUser(userId);
            if (stepsSeen[stepsSeen.length - 1] === stepId) { // Note this works fine even if stepsSeen is empty
                usersOnStep.push(userId);
            }
        }
        return usersOnStep;
    }

    public getUiStateForUser(userId: number): AnyUiState[] {
        const uiState: AnyUiState[] = [];
        for (const stepId of this.getStepsSeenByUser(userId)) {
            const step = this.steps.get(stepId);
            uiState.push(step.getUiState());
        }
        return uiState;
    }

    public async callStepHandler(data: StepResponseRequest) {
        const usersOnStep = this.getUserIdsWhoAreOnStep(data.stepId);
        if (usersOnStep.length === 0) {
            console.error(`Step ${data.stepId} is no longer the current step for any user.`);
            throw new SafeError("Cannot submit answer: game has moved on.");
        }
        const step = this.steps.get(data.stepId);
        await step.handleResponse(data);
        if (step.isComplete) {
            this.advanceUsersToNextStep(); // We don't need to wait for this result though.
        }
    }

    public async pushUiUpdate(stepId: number) {
        const step = this.steps.get(stepId);

        for (const userId of this.getUserIdsWhoAreOnStep(stepId)) {
            // Generate an ID for this notification
            const uiUpdateSeqId: number = ++(this.lastUiUpdateSeqIdsByUserId[userId]);
            // Push out a websocket notification:
            const event: GameUiChangedNotification = {
                type: NotificationType.GAME_UI_UPDATE,
                uiUpdateSeqId,
                stepIndex: this.getStepsSeenByUser(userId).indexOf(stepId),
                newStepUi: step.getUiState(),
            };
            this.publishEventToUsers([userId], event);
        }
    }

    // This is for use by getStepsSeenByUser() and pushStepSeenByUser() only:
    private _stepsSeenVarForUser(userId: number): GameVar<number[]> {
        return  {key: `stepsSeen:${userId}`, scope: GameVarScope.Game, default: []};
    }
    /** List of a all the step IDs that the user has seen. */
    private getStepsSeenByUser(userId: number): number[] {
        return this.getVar(this._stepsSeenVarForUser(userId));
    }
    private async pushStepSeenByUser(userId: number, stepId: number) {
        await this.setVar(this._stepsSeenVarForUser(userId), (ss) => ss.concat([stepId]));
    }

    /**
     * For every user, check whether or not they're ready to proceed to the next
     * step in the script, and then if so, advance them to the next step.
     * 
     * Generally if a step is shown to only one user, the rest of the team
     * must wait until that user has completed the step before they will be
     * able to proceed. The only exception are steps marked with 'parallel: yes'
     * in which case the rest of the team can proceed even while the user finishes
     * that step.
     */
    public async advanceUsersToNextStep() {
        // use a promise to make sure this only runs once at any given time,
        // and to allow us to fait for it in abandon() or finish()
        await this._updateInProgressPromise;
        this._updateInProgressPromise = this._advanceUsersToNextStep();
        await this._updateInProgressPromise;
    }

    // Don't call this directly; call advanceUsersToNextStep()
    private async _advanceUsersToNextStep() {
        if (!this.gameActive) {
            return;
        }

        let usersWhoseCurrentStepIsComplete: Set<number> = new Set();
        for (const userId of this.playerIds) {
            const currentStep = this.getCurrentStepForUser(userId);
            if (currentStep !== undefined) {
                if (currentStep.isComplete) {
                    usersWhoseCurrentStepIsComplete.add(userId);
                }
            } else {
                // Special case - just starting the game, so there is no current step per user:
                usersWhoseCurrentStepIsComplete.add(userId);
            }
        }
        // Are there any users currently on a step that they haven't yet completed?
        const anyUserIsSeeingAnIncompleteStep = this.playerIds.length > usersWhoseCurrentStepIsComplete.size;

        // Now, all the users in usersWhoseCurrentStepIsComplete should be
        // advanced to the next step, if that step isn't blocked. The step
        // is "blocked" if it is not marked as 'parallel' and there are any
        // users still on a lower step.

        let newStepIdPushed: number;
        let moreStepsToConsider = false;
        for (const userId of usersWhoseCurrentStepIsComplete) {
            const nextStep = this.computeNextStepForUser(userId);
            if (nextStep !== EndOfScript) {
                if (this.getStepsSeenByUser(userId).indexOf(nextStep.id) !== -1) {
                    throw new Error("Cannot revisit a step that has already been seen.");
                }
                // Is that step blocked?
                const blocked = anyUserIsSeeingAnIncompleteStep && nextStep.isParallel === false;
                if (!blocked) {
                    // Advance the user to this step:
                    if (newStepIdPushed === undefined || newStepIdPushed === nextStep.id) {
                        await this.pushStepSeenByUser(userId, nextStep.id);
                        newStepIdPushed = nextStep.id;
                    } else {
                        // Otherwise, we'll have to wait, because we already pushed another step
                        // for some other user, and in doing so, this step may have become blocked.
                        moreStepsToConsider = true;
                    }
                }
            } else {
                // This user has completed the game. Has everyone?
                if (!anyUserIsSeeingAnIncompleteStep) {
                    // Yep, so the game is done!
                    await this.finish();
                    return;
                }
            }
        }

        if (moreStepsToConsider) {
            await this._advanceUsersToNextStep();
        }
        if (newStepIdPushed !== undefined) {
            // At least one user got moved on to a new step:
            this.runCurrentSteps();
        }
    }

    /**
     * Recursively compute the next step for the user who is currently on
     * currentStepId (optional). Will take into account 'if' conditions.
     * Returns EndOfScript if the user has completed the game.
     * @param userId 
     * @param currentStepId 
     */
    private computeNextStepForUser(userId: number, currentStepId?: number): Step|(typeof EndOfScript) {
        let found = false;

        if (currentStepId === undefined) {
            const currentStep = this.getCurrentStepForUser(userId);
            if (currentStep !== undefined) {
                currentStepId = currentStep.id;
            } else {
                // This user is just starting, and hasn't seen any steps yet,
                // so choose the very first step.
                found = true;
            }
        }

        // Figure out the ID of the step after the current one:
        for (const nextStepId of this.steps.keys()) {
            if (found) {
                // The previous step was the current step, so this is the next step.
                const step = this.steps.get(nextStepId);

                if (step.ifCondition !== undefined) {
                    const result = !!this.safeEvalScriptExpression(step.ifCondition, userId);
                    if (!result) {
                        // That step can't be the next one because its if condition failed.
                        // Keep looking, recursively:
                        return this.computeNextStepForUser(userId, step.id);
                    }
                }

                return step;

            } else if (nextStepId === currentStepId) {
                found = true;
            }
        }
        return EndOfScript; // There is no next step; perhaps we've completed the game.
    }

    /**
     * Safely evaluate a JavaScript expression and return the result (synchronously)
     * The JavaScript in question can load any Game or Team-scoped variable using
     * the VAR(key: string) function, which will return undefined if the var has
     * never been set. It can also use the ROLE() function to see if the current
     * user has been assigned to the role in question.
     * @param jsExpression 
     */
    public safeEvalScriptExpression(jsExpression: string, userId: number): any {
        const jsInterpreter = new JsInterpreter(jsExpression, (interpreter, scope) => {
            const getVariable = (name: string) => {
                const notSet = Symbol();
                let result = this._getGameVar({key: name, scope: GameVarScope.Game, default: notSet});
                if (result === notSet) {
                    result = this._getTeamVar({key: name, scope: GameVarScope.Team, default: undefined});
                }
                return interpreter.nativeToPseudo(result);
            };
            interpreter.setProperty(scope, 'VAR', interpreter.createNativeFunction(getVariable));
            const checkIfUserHasRole = (roleId: string) => {
                const userIdWithRole = getPlayerIdWithRole(this, roleId);
                if (userIdWithRole === undefined) {
                    throw new Error(`Invalid role passed to ROLE() function: ${roleId}`);
                }
                return interpreter.nativeToPseudo(userIdWithRole === userId);
            }
            interpreter.setProperty(scope, 'ROLE', interpreter.createNativeFunction(checkIfUserHasRole));
        });
        let maxSteps = 200, running = true;
        do { running = jsInterpreter.step(); } while (running && maxSteps-- > 0);
        return jsInterpreter.pseudoToNative(jsInterpreter.value);
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
                db: await getDB(),
                publishEventToUsers,
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

            const scenario = await context.db.scenarios.findOne({id: game.scenario_id, is_active: true});
            const scriptSteps = await loadScriptFile(scenario.script);

            const team = await context.db.teams.findOne(game.team_id);
            const teamMembers = await context.db.team_members.find({team_id: team.id, is_active: true}, {columns: ['id']});

            return new GameManager({context, game, players: teamMembers, teamVars: team.game_vars, scriptSteps});
        })();
        gameManagerCache.set(gameId, newGameManagerPromise);
        return await newGameManagerPromise;
    }

    static async startGame(teamId: number, scenarioId: number, context?: GameManagerContext): Promise<{manager: GameManager, status: GameStatus}> {
        if (context === undefined) {
            context = {
                db: await getDB(),
                publishEventToUsers,
            }
        }
        const newGameManagerPromise = (async () => {
            const team = await context.db.teams.findOne({id: teamId});
            const teamMembers = await context.db.team_members.find({team_id: team.id, is_active: true});
            if (teamMembers.length < 2) {
                throw new SafeError("You must have at least two people on your team to play.");
            } else if (teamMembers.length > 5) {
                throw new SafeError("Too many people on the team."); // This shouldn't be possible.
            }
            const scenario = await context.db.scenarios.findOne({id: scenarioId, is_active: true});
            if (scenario === null) {
                throw new SafeError("Invalid scenario.");
            }
            // Start the game!
            let game: Game;
            try {
                game = await context.db.games.insert({
                    team_id: team.id,
                    scenario_id: scenario.id,
                    is_active: true,
                });
            } catch (error) {
                throw new SafeError("Unable to start playing. Did the game already start?");
            }
            const manager = await GameManager.loadGame(game.id, context);
            // Notify everyone that the game has started:
            const gameStatus: GameStatus = {
                scenarioId: scenario.id,
                scenarioName: scenario.name,
                isActive: true,
            };
            context.publishEventToUsers(teamMembers.map(tm => tm.user_id), {type: NotificationType.GAME_STATUS_CHANGED, ...gameStatus});
            return {manager, status: gameStatus};
        })();
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
        if (!this.gameActive) {
            throw new Error("Cannot update any variable after the game is complete.");
        }
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
        await this._updateInProgressPromise;
        this._gameActive = false;
        await this.db.games.update({id: this.gameId}, {is_active: false});
        this.publishEventToUsers(this.playerIds, {
            type: NotificationType.GAME_STATUS_CHANGED,
            scenarioId: 0,
            scenarioName: "",
            isActive: false,
        });
    }
    /**
     * Mark this game as successfully finished.
     * Save any pending changes to the team vars (like # of saltines earned).
     */
    public async finish() {
        // Mark the game as finished, but check that it wasn't already finished or abandoned
        await this._updateInProgressPromise;
        await this.db.instance.tx('update_team_var', async (task) => {
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
        this._gameActive = false;
        this.publishEventToUsers(this.playerIds, {
            type: NotificationType.GAME_STATUS_CHANGED,
            scenarioId: 0,
            scenarioName: "",
            isActive: false,
        });
    }
}
