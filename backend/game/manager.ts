import * as JsInterpreter from "js-interpreter";
import { BorisDatabase, getDB } from "../db/db";
import { Game, User } from "../db/models";
import { GameStatus, GameManagerStepInterface } from './manager-defs';
import { GameVar, GameVarScope } from "./vars";
import { Step } from "./step";
import { loadStepFromData } from "./steps/loader";
import { AnyUiState } from "../../common/game";
import { publishEventToUsers } from "../websocket/pub-sub";
import { GameUiChangedNotification, NotificationType, GameErrorNotification } from "../../common/notifications";
import { loadScript } from "./script-loader";
import { SafeError } from "../routes/api-utils";
import { GameDetailedStatus, StepResponseRequest } from "../../common/api";
import { getPlayerIdWithRole } from "./steps/assign-roles";
import { GotoStep } from "./steps/goto-step";
import { TargetStep } from "./steps/target-step";
import { FinishLineStep } from "./steps/finish-line-step";

/** External services that the GameManager needs to run */
interface GameManagerContext {
    db: BorisDatabase;
    publishEventToUsers: typeof publishEventToUsers;
}

interface GameManagerInitData {
    context: GameManagerContext;
    game: Game;
    players: User[];
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

/** Create a numeric hash from the given string. */
function hashKey(key: string) {
    let hash: number = 0;
    for (let i = 0; i < key.length; i++) {
        const chr = key.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return hash;
};

export class GameManager implements GameManagerStepInterface {
    private readonly db: BorisDatabase;
    private readonly publishEventToUsers: typeof publishEventToUsers;
    /** If the game is completed or abandoned, this gets set to false. Read it publicly as 'status'. */
    private _gameStatus: GameStatus;
    readonly gameId: number;
    readonly teamId: number;
    readonly playerIds: number[];
    readonly playerData: {[key: number]: User}; // Cached user data so we can read it synchronously
    private startedAt: Date;
    private finishedAt?: Date;
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
    _stepRunPendingCount: number;
    /**
     * We don't want to run two separate instances of this.advanceUsersToNextStep()
     * simultaneously, nor do we want to terminate the game while it's running,
     * so this promise is used to avoid that by being unresolved while
     * advanceUsersToNextStep() runs.
     */
    _advanceUsersToNextStepPromise: Promise<void>;
    _advanceUsersToNextStepPendingCount: number;

    private constructor(data: GameManagerInitData) {
        this.db = data.context.db;
        this.publishEventToUsers = data.context.publishEventToUsers;
        this._gameStatus = (
            data.game.is_active ? GameStatus.InProgress :
            data.game.finished ? GameStatus.Complete :
            GameStatus.Abandoned
        );
        this.startedAt = data.game.started;
        this.finishedAt = data.game.finished ? data.game.finished : undefined;
        this.gameId = data.game.id;
        this.teamId = data.game.team_id;
        this.playerIds = data.players.map(entry => entry.id);
        this.playerData = {};
        for (const player of data.players) {
            this.playerData[player.id] = player;
        }
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
        this._stepRunPendingCount = 0;
        this._advanceUsersToNextStepPromise = new Promise(resolve => { resolve(); });
        this._advanceUsersToNextStepPendingCount = 0;
        if (this._gameStatus === GameStatus.InProgress) {
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
    }

    get status() { return this._gameStatus; }
    get isGameActive() { return this._gameStatus === GameStatus.InProgress || this._gameStatus === GameStatus.InReview; }

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
        if (!this.isGameActive) {
            return;
        }
        const activeStepIds: Set<number> = new Set();
        this.playerIds.forEach(userId => {
            const currentStep = this.getCurrentStepForUser(userId);
            if (currentStep !== undefined) {
                activeStepIds.add(currentStep.id);
            }
        });

        for (const stepId of activeStepIds) {
            if (this.stepRunPromisesByStepId.get(stepId) === undefined) {
                const step = this.steps.get(stepId);
                this._stepRunPendingCount++;
                this.stepRunPromisesByStepId.set(stepId, step.run().then(() => {
                    if (step.isComplete && this.isGameActive) {
                        this.advanceUsersToNextStep(); // We don't need to wait for this result though.

                        // Special case for the 'finish line' step:
                        if (step instanceof FinishLineStep && this._gameStatus === GameStatus.InProgress) {
                            this.finish();
                        }
                    }
                    this._stepRunPendingCount--;
                }, (err) => {
                    // The step failed to run.
                    if (this.isGameActive) {
                        console.error(`Unable to finish running step ${stepId}: ${err}`);
                        this.playerIds.forEach(userId => {
                            if (this.getCurrentStepForUser(userId).id === stepId) {
                                this.publishErrorToUser(userId, `Error while running step ${stepId}.`);
                            }
                        });
                    }
                    this._stepRunPendingCount--;
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
        if (!this.isGameActive) {
            throw new SafeError("Game has ended already.");
        }
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
    public advanceUsersToNextStep() {
        // use a promise to make sure this only runs once at any given time,
        // and to allow us to wait for it in abandon() or finish()
        if (this._advanceUsersToNextStepPendingCount++ === 0) {
            this._advanceUsersToNextStepPromise = new Promise(async (resolve) => {
                while (this._advanceUsersToNextStepPendingCount > 0) {
                    await this._advanceUsersToNextStep();
                    this._advanceUsersToNextStepPendingCount--;
                }
                resolve();
            });
        }
        return this._advanceUsersToNextStepPromise;
    }

    // Don't call this directly; call advanceUsersToNextStep()
    private async _advanceUsersToNextStep() {
        if (!this.isGameActive) {
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

        let moreStepsToConsider = false;
        let newStepsPushed = false;
        do {
            // Are there any users currently on a step that they haven't yet completed?
            const anyUserIsSeeingAnIncompleteStep = this.playerIds.length > usersWhoseCurrentStepIsComplete.size;

            // Now, all the users in usersWhoseCurrentStepIsComplete should be
            // advanced to the next step, if that step isn't blocked. The step
            // is "blocked" if it is not marked as 'parallel' and there are any
            // users still on a lower step.

            // However, as soon as we advance some of the users to a new step,
            // others may not be eligible to advance anymore.
            // 'toAdvance' stores the pairs of [stepId, userIds] that are
            // potentially eligible to advance.
            const toAdvance: {[stepId: number]: number[]} = {};
            let numUsersAtEndOfScript = 0;
            for (const userId of usersWhoseCurrentStepIsComplete) {
                const nextStep = this.computeNextStepForUser(userId);
                if (nextStep !== EndOfScript) {
                    if (this.getStepsSeenByUser(userId).indexOf(nextStep.id) !== -1) {
                        throw new Error("Cannot revisit a step that has already been seen.");
                    }
                    // Is that step blocked?
                    const blocked = anyUserIsSeeingAnIncompleteStep && nextStep.isParallel === false;
                    if (!blocked) {
                        // Plan to move this user to this step:
                        if (toAdvance[nextStep.id] === undefined) {
                            toAdvance[nextStep.id] = [];
                        }
                        toAdvance[nextStep.id].push(userId);
                    }
                } else {
                    // This user has completed the game. 
                    numUsersAtEndOfScript++;
                }
            }

            // Has everyone completed the game?
            if (!anyUserIsSeeingAnIncompleteStep && numUsersAtEndOfScript === this.playerIds.length) {
                // Yep, so the game is done!
                if (this._gameStatus === GameStatus.InProgress) {
                    await this.finish();
                }
                return;
            }

            const numStepsCurrentlyReadyToAdvance = Object.keys(toAdvance).length;

            if (numStepsCurrentlyReadyToAdvance > 0) {

                // The big problem is that 'toAdvance' is not sorted... we need to find the first
                // step (coming easrliest in the script), and advance all eligible users to that
                // step, then re-evaluate everything in light of that change.
                let earliestStepId: number;
                let userIdsForEarliestStep: number[];
                for (const stepId of this.steps.keys()) {
                    if (stepId in toAdvance) {
                        earliestStepId = stepId;
                        userIdsForEarliestStep = toAdvance[stepId];
                        break;
                    }
                }

                for (const userId of userIdsForEarliestStep) {
                    await this.pushStepSeenByUser(userId, earliestStepId);
                    const step = this.steps.get(earliestStepId);
                    if (step.isComplete && this.stepRunPromisesByStepId.has(step.id)) { // Check stepRunPromises because some steps 
                        // Somehow this step is already complete. Possibly it is a parallel step and
                        // another user already completed it.
                        if (step.getUiState() !== null) {
                            await this.pushUiUpdate(step.id);
                        }
                    } else {
                        usersWhoseCurrentStepIsComplete.delete(userId);
                    }
                }
                newStepsPushed = true;
            }

            moreStepsToConsider = numStepsCurrentlyReadyToAdvance > 1;

        } while (moreStepsToConsider);

        if (newStepsPushed) {
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
                    let result: boolean;
                    try {
                        result = !!this.safeEvalScriptExpression(step.ifCondition, userId);
                    } catch (err) {
                        this.publishErrorToUser(userId, `Error evaluating if condition: ${err.message}`);
                    }
                    if (!result) {
                        // That step can't be the next one because its if condition failed.
                        // Keep looking, recursively:
                        return this.computeNextStepForUser(userId, step.id);
                    }
                }

                if (step instanceof GotoStep) {
                    return this.getGotoTargetStep(step, userId);
                }
                return step;

            } else if (nextStepId === currentStepId) {
                found = true;
            }
        }
        return EndOfScript; // There is no next step; perhaps we've completed the game.
    }

    /**
     * If we're currently on a Goto step, find the corresponding target step.
     * @param currentStep The Goto step that we're on
     * @param userId The ID of the user who's on the goto step.
     */
    private getGotoTargetStep(currentStep: GotoStep, userId: number): Step|typeof EndOfScript {
        const targetName = currentStep.settings.name;
        let passedCurrentStep = false;
        for (const step of this.steps.values()) {
            if (step === currentStep) {
                passedCurrentStep = true;
            } else if (passedCurrentStep && step instanceof TargetStep && step.settings.name === targetName) {
                // Target steps don't have 'if' conditions so we can go there unconditionally
                return step;
            }
        }
        // Otherwise, we couldn't find the target step:
        this.publishErrorToUser(userId, `Can't find target step with name: ${targetName}`);
        return EndOfScript;
    }

    private publishErrorToUser(userId: number, debuggingInfoForConsole: string, friendlyErrorMessage: string = "Sorry, something went sideways with this part of the scenario. Pretend you didn't see this and carry on!") {
        const errorNotification: GameErrorNotification = {
            type: NotificationType.GAME_ERROR,
            friendlyErrorMessage,
            debuggingInfoForConsole,
        };
        publishEventToUsers([userId], errorNotification);
    }

    /**
     * Get how long this game has been running for / ran for, in seconds.
     * While the game is running, this might be slightly inaccurate as it
     * compares the app server's clock time to the start time in the
     * database. But if the game is finished, it will use the start time
     * and finish time as computed by the same source (the DB server).
     **/
    public getElapsedTime(): number {
        if (this.finishedAt !== undefined) {}
        const endTimestamp = this.finishedAt ? this.finishedAt : new Date();
        return Math.round((+endTimestamp - (+this.startedAt)) / 1000);
    }

    /**
     * Safely evaluate a JavaScript expression and return the result (synchronously)
     * The JavaScript in question can load any Game or Team-scoped variable using
     * the VAR(key: string) function, which will return undefined if the var has
     * never been set. It can also use the ROLE() function to see if the current
     * user has been assigned to the role in question.
     * @param jsExpression 
     */
    public safeEvalScriptExpression(jsExpression: string, userId?: number): any {
        const jsInterpreter = new JsInterpreter(jsExpression, (interpreter, scope) => {
            const getVariable = (_name: JsInterpreter.Value, _defaultValue?: JsInterpreter.Value) => {
                const name: string = interpreter.pseudoToNative(_name);
                const defaultValue: any = _defaultValue !== undefined ? interpreter.pseudoToNative(_defaultValue) : undefined;
                const notSet = Symbol();
                let result = this._getGameVar({key: name, scope: GameVarScope.Game, default: notSet});
                if (result === notSet) {
                    result = this._getTeamVar({key: name, scope: GameVarScope.Team, default: defaultValue});
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
            if (userId !== undefined) {
                interpreter.setProperty(scope, 'ROLE', interpreter.createNativeFunction(checkIfUserHasRole));
                const getUserInfo = () => {
                    return interpreter.nativeToPseudo(this.playerData[userId]);
                };
                interpreter.setProperty(scope, 'USER_INFO', interpreter.createNativeFunction(getUserInfo));
            }
            const playerNameWithRole = (roleId: string) => {
                const userIdWithRole = getPlayerIdWithRole(this, roleId);
                if (userIdWithRole === undefined) {
                    throw new Error(`Invalid role passed to ROLE() function: ${roleId}`);
                }
                const firstName = this.playerData[userIdWithRole].first_name;
                return interpreter.nativeToPseudo(firstName);
            }
            interpreter.setProperty(scope, 'NAME_WITH_ROLE', interpreter.createNativeFunction(playerNameWithRole));
            interpreter.setProperty(scope, 'NUM_PLAYERS', interpreter.nativeToPseudo(this.playerIds.length));
            const getTimeElapsed = () => {
                return interpreter.nativeToPseudo(Math.round(this.getElapsedTime() / 60.0));
            }
            interpreter.setProperty(scope, 'ELAPSED_MINUTES', interpreter.createNativeFunction(getTimeElapsed));
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

            const scenario = await context.db.scenarios.findOne({id: game.scenario_id, is_active: true});
            const scriptSteps = await loadScript(context.db, scenario.script);

            const team = await context.db.teams.findOne(game.team_id);
            const teamMembers = await context.db.team_members.find({team_id: team.id, is_active: true}, {columns: ['user_id']});
            const playerIds = teamMembers.map(entry => entry.user_id);
            const players = await context.db.users.find({id: playerIds});

            return new GameManager({context, game, players, teamVars: team.game_vars, scriptSteps});
        })();
        gameManagerCache.set(gameId, newGameManagerPromise);
        return await newGameManagerPromise;
    }

    static async startGame(teamId: number, scenarioId: number, context?: GameManagerContext): Promise<{manager: GameManager, status: GameDetailedStatus}> {
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
            const gameStatus: GameDetailedStatus = {
                gameId: game.id,
                scenarioId: scenario.id,
                scenarioName: scenario.name,
                isActive: true,
                isFinished: false,
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
        if (!this.isGameActive) {
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
        const startTime = +new Date();
        const result = await this.db.instance.tx('update_game_var', async (task) => {
            // Acquire a lock on the specific variable we're about to update, then call the updater
            // method, then save the result. This enables atomic increments, etc.
            // We use [game ID, 'g' + var key] as a custom lock. This is because if we lock the whole
            // row, we will often run into slow lock acquisition due to concurrent lock requests for
            // team vars and other game vars. Since we use jsonb_set() we don't need to lock the row,
            // only to avoid concurrent writes to the same variable.
            await task.one('SELECT pg_advisory_xact_lock($1, $2)', [this.gameId, hashKey(`g${variable.key}`)]);
            const origData = await task.one('SELECT game_vars FROM games WHERE id = $1', [this.gameId]);
            const origValue: T = variable.key in origData.game_vars ? origData.game_vars[variable.key] : variable.default;
            let newValue: any = updater(origValue);
            let forceCast = '';
            if (newValue === null) { // Storing NULL is tricky:
                newValue = 'null';
                forceCast = '::jsonb';
            } else if (typeof newValue === 'string') {
                forceCast = '::text'; // to_jsonb() needs to know how to interpret a string type.
            }
            const result = await task.one(
                // use jsonb_set to guarantee that we don't affect other variables
                `UPDATE games SET game_vars = jsonb_set(game_vars, $2, to_jsonb($3${forceCast}))
                WHERE id = $1 RETURNING game_vars;`,
                [this.gameId, `{${variable.key}}`, newValue]
            );
            this.gameVars = result.game_vars;
            return this.gameVars[variable.key];
        });
        const timeTaken = (+new Date()) - startTime;
        if (timeTaken > 500) {
            console.error(`     Took ${timeTaken}ms to save game var ${variable.key} for game ${this.gameId}`);
        }
        return result;
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
        if (this._gameStatus !== GameStatus.InProgress) {
            throw new SafeError("Cannot update team vars if the game is not in progress.");
            // Note in particular that we do not allow writing to team vars while the game
            // is in review status, since the changes would never get saved to the team row
            // in the DB, which only happens during finish().
        }
        const startTime = +new Date();
        const result = await this.db.instance.tx('update_team_var', async (task) => {
            // Acquire a lock on the specific variable we're about to update, then call the updater
            // method, then save the result. This enables atomic increments, etc.
            // We use [game ID, 't' + var key] as a custom lock. This is because if we lock the whole
            // row, we will often run into slow lock acquisition due to concurrent lock requests for
            // team vars and other game vars. Since we use jsonb_set() we don't need to lock the row,
            // only to avoid concurrent writes to the same variable.
            await task.one('SELECT pg_advisory_xact_lock($1, $2)', [this.gameId, hashKey(`t${variable.key}`)]);
            const origData = await task.one('SELECT pending_team_vars FROM games WHERE id = $1', [this.gameId]);
            const origValue: T = (
                variable.key in origData.pending_team_vars ? origData.pending_team_vars[variable.key] :
                variable.key in this.teamVars ? this.teamVars[variable.key] :
                variable.default
            );
            let newValue: any = updater(origValue);
            let forceCast = '';
            if (newValue === null) { // Storing NULL is tricky:
                newValue = 'null';
                forceCast = '::jsonb';
            } else if (typeof newValue === 'string') {
                forceCast = '::text'; // to_jsonb() needs to know how to interpret a string type.
            }
            const result = await task.one(
                // use jsonb_set to guarantee that we don't affect other variables
                `UPDATE games SET pending_team_vars = jsonb_set(pending_team_vars, $2, to_jsonb($3${forceCast}))
                WHERE id = $1 RETURNING pending_team_vars;`,
                [this.gameId, `{${variable.key}}`, newValue]
            );
            this.pendingTeamVars = result.pending_team_vars;
            return this.pendingTeamVars[variable.key];
        });
        const timeTaken = (+new Date()) - startTime;
        if (timeTaken > 500) {
            console.error(`     Took ${timeTaken}ms to save team var ${variable.key} for game ${this.gameId}`);
        }
        return result;
    }
    /**
     * Mark this game as abandoned.
     * Discard any pending changes to the team vars (like # of saltines earned).
     */
    public async abandon() {
        await this._advanceUsersToNextStepPromise;
        this._gameStatus = GameStatus.Abandoned;
        await this.db.games.update({id: this.gameId}, {is_active: false});
        this.publishEventToUsers(this.playerIds, {
            type: NotificationType.GAME_STATUS_CHANGED,
            gameId: this.gameId,
            isActive: false,
            isFinished: false,
        });
    }
    /**
     * Mark this game as successfully finished.
     * Save any pending changes to the team vars (like # of saltines earned).
     * The scenario script _may_ optionally continue for a bit after this point,
     * but cannot make further changes to team vars.
     */
    private async finish() {
        if (this._gameStatus !== GameStatus.InProgress) {
            throw new SafeError("Cannot finish a game that is not in progress.");
        }
        // Mark the game as finished, but check that it wasn't already finished or abandoned
        let finishedAt: Date;
        await this.db.instance.tx('finish_game', async (task) => {
            let result: any;
            await task.none('START TRANSACTION');
            try {
                result = await task.one(
                    `UPDATE games SET finished = NOW(), is_active = FALSE WHERE id = $1 AND is_active = TRUE RETURNING pending_team_vars, finished`,
                    [this.gameId]
                );
            } catch (err) {
                throw new Error("Game was not active.");
            }
            const pendingTeamVars = result.pending_team_vars;
            finishedAt = result.finished;
            // Always fetch the latest team vars from the DB in this transaction instead of trusting this.teamVars:
            const oldTeamVars = (await task.one('SELECT game_vars FROM teams WHERE id = $1', [this.teamId])).game_vars;
            const combinedTeamVars = {...oldTeamVars, ...pendingTeamVars};
            await task.none(
                `UPDATE teams SET game_vars = $2 WHERE id = $1`,
                [this.teamId, combinedTeamVars]
            );
        });
        this.finishedAt = finishedAt;
        this._gameStatus = GameStatus.InReview;
        this.publishEventToUsers(this.playerIds, {
            type: NotificationType.GAME_STATUS_CHANGED,
            gameId: this.gameId,
            isActive: false,
            isFinished: true,
        });
    }

    /**
     * Wait for all pending steps that can be run to be run.
     * This is *** only for use in tests ***
     */
    public async allPendingStepsFlushed() {
        while(this._stepRunPendingCount + this._advanceUsersToNextStepPendingCount > 0) {
            await Promise.all(this.stepRunPromisesByStepId.values());
            await this._advanceUsersToNextStepPromise;
        }
    }
}

/**
 * A fake GameManager that doesn't do anything; useful when
 * validating steps outside of a game context.
 */
export class VoidGameManager implements GameManagerStepInterface {
    get status(): GameStatus { return GameStatus.InProgress; }
    get playerIds(): number[] { return []; }
    public async pushUiUpdate(stepId: number) {}
    private keyForVar(variable: GameVar<any>, stepId?: number): string {
        return String(variable.scope) + (variable.scope === GameVarScope.Step ? stepId : '') + variable.key;
    }
    public getVar<T>(variable: Readonly<GameVar<T>>, stepId?: number): T { return variable.default; }
    public async setVar<T>(variable: Readonly<GameVar<T>>, updater: (value: T) => T, stepId?: number): Promise<T> {
        return updater(this.getVar(variable));
    }
    public safeEvalScriptExpression(jsExpression: string) { throw new Error("Unimplemented"); }
}
