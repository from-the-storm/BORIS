import { AnyUiState, StepType, GameUserRole, MessageStepUiState, FreeResponseStepUiState } from "../../common/game";
import { GameManager } from "./manager";
import { GameVar, GameVarScope } from "./vars";


const SaltinesVar: GameVar<number> = {key: 'saltines', scope: GameVarScope.Team, default: 0};

interface StepParams {
    id: number;
    manager: GameManager;
    settings: Readonly<any>; // settings that define how this step works (immutable)
}

export abstract class Step {
    readonly id: number;
    private readonly manager: GameManager;
    readonly settings: any;
    public static readonly stepType: StepType = StepType.Unknown;

    constructor(args: StepParams) {
        this.id = args.id;
        this.manager = args.manager;
        this.settings = args.settings;
        this.validateSettings();
    }

    static loadFromData(data: any, id: number, manager: GameManager) {
        const {step, ...otherData} = data; // Remove the 'step' key from the data; 'step' is the step type.
        const args: StepParams = {id, manager, settings: otherData};
        switch (step) {
            case 'message': return new MessageStep(args);
            case 'free response': return new FreeResponseStep(args);
            default: throw new Error(`Unable to load type with step type "${step}".`);
        }
    }

    protected getVar<T>(variable: GameVar<T>): T {
        return this.manager.getVar(variable, this.id);
    }
    protected async setVar<T>(variable: GameVar<T>, updaterOrValue: ((val: T) => T)|T): Promise<T> {
        const updater = (typeof updaterOrValue === 'function') ? updaterOrValue : () => updaterOrValue;
        return this.manager.setVar(variable, updater, this.id);
    }

    protected validateSettings() {}

    public abstract getUiState(): AnyUiState;

    protected advanceToNextstep(): Promise<void> {
        return this.manager.advanceToNextstep();
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
    }
}

class MessageStep extends Step {
    public static readonly stepType: StepType = StepType.MessageStep;
    readonly settings: {
        messages: string[],
        character?: string,
    };
    public static readonly numMessagesShown: GameVar<number> = {key: 'show', scope: GameVarScope.Step, default: 0};
    get numMessagesShown() { return this.getVar(MessageStep.numMessagesShown); }

    async run() {
        while (this.numMessagesShown < this.settings.messages.length) {
            await this.sleep(`m${this.numMessagesShown}`, 1000);
            await this.setVar(MessageStep.numMessagesShown, n => n + 1);
            this.pushUiUpdate();
        }
        this.advanceToNextstep();
    }

    protected validateSettings() {
        if (!Array.isArray(this.settings.messages)) {
            throw new Error("Message step must have a list of messages defined.");
        }
        if (this.settings.character && typeof this.settings.character !== 'string') {
            throw new Error(`Invalid character: ${this.settings.character}`);
        }
    }

    getUiState(): MessageStepUiState {
        if (this.numMessagesShown === 0) {
            return null;
        }
        const saltines = this.getVar(SaltinesVar);
        return {
            type: StepType.MessageStep,
            stepId: this.id,
            messages: this.settings.messages.slice(0, this.numMessagesShown),
            forRoles: [GameUserRole.Wayfinder],
            ...(this.settings.character ? {character: this.settings.character} : {})
        };
    }
}


class FreeResponseStep extends Step {
    public static readonly stepType: StepType = StepType.FreeResponse;
    readonly settings: {key: string};

    async run() {
        //this.pushUiUpdate();
    }

    protected validateSettings() {
        if (typeof this.settings.key !== 'string' || !this.settings.key) {
            throw new Error("Free Response step must have a key defined (e.g. 'key: userGuess').");
        }
    }

    get valueVar(): GameVar<string> {
        return {key: this.settings.key, scope: GameVarScope.Step, default: ''};
    }

    getUiState(): FreeResponseStepUiState {
        const value = this.getVar(this.valueVar);
        return {
            type: StepType.FreeResponse,
            stepId: this.id,
            multiline: false,
            complete: value !== '',
            value,
        };
    }
}

