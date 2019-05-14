import { AnyUiState, StepType } from "../../common/game";
import { GameStatus, GameManagerStepInterface } from './manager-defs';
import { GameVar, GameVarScope } from "./vars";
import { StepResponseRequest } from "../../common/api";
import { SafeError } from "../routes/api-utils";


export interface StepParams {
    id: number;
    manager: GameManagerStepInterface;
    config: Readonly<any>; // settings that define how this step works (immutable)
}

export abstract class Step {
    readonly id: number;
    private readonly manager: GameManagerStepInterface;
    readonly settings: any;
    /** If this is set, it's a JavaScript expression, and this step should be ignored if it evaluates to false. */
    readonly ifCondition: string|undefined;
    /** If this is true, the rest of the team can proceed on further into the script, while one person responds to this step. */
    readonly isParallel: boolean;
    public static readonly stepType: StepType = StepType.Unknown;

    constructor(args: StepParams) {
        this.id = args.id;
        this.manager = args.manager;

        let config = {...args.config};
        if (config.if !== undefined) {
            this.ifCondition = config.if;
            delete config.if;
        }
        if (config.parallel !== undefined) {
            this.isParallel = !!config.parallel;
            delete config.parallel;
        } else {
            this.isParallel = false;
        }
        this.settings = this.parseConfig(config);
    }

    protected getVar<T>(variable: GameVar<T>): T {
        return this.manager.getVar(variable, this.id);
    }
    protected async setVar<T extends string|number|boolean|undefined|null|any[]>(variable: GameVar<T>, updaterOrValue: ((val: T) => T)|T): Promise<T> {
        const updater = (typeof updaterOrValue === 'function') ? updaterOrValue : () => updaterOrValue;
        return this.manager.setVar(variable, updater, this.id);
    }
    protected getPlayerIds(): number[] {
        return this.manager.playerIds;
    }

    protected parseConfig(config: any) {
        return config;
    }

    public abstract getUiState(): AnyUiState;

    /** 
     * Return true if the step is complete, and the team should advance to the next step of the script.
     * The result of this method should only ever be change during run() or handleResponse().
     * If it changes outside of one of those methods, the game may get "stuck" and never advance
     * to the next step.
     **/
    public abstract get isComplete(): boolean;

    /** Handle input from the user, while this step is active. */
    public async handleResponse(data: StepResponseRequest) {
        if (this.isComplete) {
            throw new SafeError("Choice already made.");
        }
        return this._handleResponse(data);
    }

    /**
     * Step-type-sepcific implementation to handle input from the user, while this step is active.
     * this.isComplete is guaranteed to be false if this gets called.
     **/
    protected async _handleResponse(data: StepResponseRequest) {
        throw new SafeError("Cannot submit data to this step.");
    }

    /**
     * run this step. This will normally only get called once, but
     * should be robust enough to be killed and run again if the
     * server is restarted.
     * 
     * Use functions like 'this.sleep()' to do that conveniently.
     */
    public abstract async run(): Promise<void>;

    /** Push out the updated value of getUiState() to all players */
    protected async pushUiUpdate() {
        await this.manager.pushUiUpdate(this.id);
    }

    /**
     * Helper method for sleeping 'correctly'. Creates a timer with a unique ID
     * within this step's scope. Each timer can only be used once; using it multiple
     * times will return immediately.
     * 
     * This function is complex because it is designed to work even if the server
     * restarts at any point in time.
     * @param sleepId 
     * @param timeoutMs 
     */
    protected async sleep(sleepId: string, timeoutMs: number) {
        const resumeAt: GameVar<number|undefined> = {key: `sleep_until:${sleepId}`, scope: GameVarScope.Step, default: undefined};
        if (this.getVar(resumeAt) === undefined) {
            await this.setVar(resumeAt, +new Date() + timeoutMs);
        }
        const timeLeft = this.getVar(resumeAt) - (+new Date());
        if (timeLeft > 0) {
            await new Promise(resolve => setTimeout(resolve, timeLeft));
        }
        if (this.manager.status !== GameStatus.InProgress && this.manager.status !== GameStatus.InReview) {
            throw new Error("Skipping rest of step run() - game is over.");
        }
    }

    protected safeEvalScriptExpression(jsExpression: string) {
        return this.manager.safeEvalScriptExpression(jsExpression);
    }
}
