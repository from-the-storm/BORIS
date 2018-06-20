import { AnyUiState, StepType, GameUserRole, MessageStepUiState, FreeResponseStepUiState, MultipleChoiceStepUiState } from "../../common/game";
import { GameManager } from "./manager";
import { GameVar, GameVarScope } from "./vars";
import { StepResponseRequest, MultipleChoiceStepResponseRequest, FreeResponseStepResponseRequest } from "../../common/api";
import { SafeError } from "../routes/api-utils";


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
        this.settings = this.parseConfig(args.settings);
    }

    static loadFromData(data: any, id: number, manager: GameManager) {
        const {step, ...otherData} = data; // Remove the 'step' key from the data; 'step' is the step type.
        const args: StepParams = {id, manager, settings: otherData};
        switch (step) {
            case 'message': return new MessageStep(args);
            case 'free response': return new FreeResponseStep(args);
            case 'choice': return new MultipleChoiceStep(args);
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
    }

    protected parseConfig(config: any): any {
        if (!Array.isArray(config.messages)) {
            throw new Error("Message step must have a list of messages defined.");
        }
        if (config.character && typeof config.character !== 'string') {
            throw new Error(`Invalid character: ${config.character}`);
        }
        return config;
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

    public get isComplete() {
        return this.numMessagesShown >= this.settings.messages.length;
    }
}


class FreeResponseStep extends Step {
    public static readonly stepType: StepType = StepType.FreeResponse;
    readonly settings: {key: string};

    async run() {}

    protected parseConfig(config: any): any {
        if (typeof config.key !== 'string' || !config.key) {
            throw new Error("Free Response step must have a key defined (e.g. 'key: userGuess').");
        }
        return config;
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

    protected async _handleResponse(data: FreeResponseStepResponseRequest) {
        let value = data.value ? data.value.trim() : '';
        if (value === '') {
            throw new SafeError("Invalid input (empty).");
        }
        await this.setVar(this.valueVar, data.value);
        await this.pushUiUpdate();
    }

    public get isComplete() {
        return this.getVar(this.valueVar) !== '';
    }
}


interface MultipleChoiceStepSettings {
    id: string,
    choices: {id: string, choiceText: string}[],
    correctChoice?: string,
};
class MultipleChoiceStep extends Step {
    public static readonly stepType: StepType = StepType.FreeResponse;
    readonly settings: MultipleChoiceStepSettings;

    async run() {}

    protected parseConfig(config: any): MultipleChoiceStepSettings {
        // Parse yaml config like:
        // - step: choice
        //   id: howfar
        //   correct: halfway
        //   choices:
        //     - halfway: Halfway there
        //     - alone: You said survive alone
        if (typeof config.id !== 'string') {
            throw new Error("Multiple step must have an 'id' defined to store the user's choice.");
        }
        if (!Array.isArray(config.choices)) {
            throw new Error("Multiple choice step should have an array of choices called 'choices'.");
        }
        let choices: {id: string, choiceText: string}[] = [];
        for (const entry of config.choices) {
            const keys = Object.keys(entry); // Should only be one, e.g. 'halfway'
            if (keys.length != 1) { throw new Error("Invalid choice in Multiple Choice step"); }
            choices.push({id: keys[0], choiceText: entry[keys[0]]});
        }
        return {
            id: config.id,
            choices,
            correctChoice: (config.correct && (choices.map(c => c.id).indexOf(config.correct) !== -1)) ? config.correct : undefined,
        }
    }

    get choiceVar(): GameVar<string> {
        return {key: `mc:${this.settings.id}`, scope: GameVarScope.Game, default: ''};
    }

    isChoiceIdValid(choiceId: string): boolean {
        for (const choice of this.settings.choices) {
            if (choice.id == choiceId) {
                return true;
            }
        }
        return false;
    }

    getUiState(): MultipleChoiceStepUiState {
        const choiceId = this.getVar(this.choiceVar);
        const choiceMade = this.isComplete;
        return {
            type: StepType.MultipleChoice,
            stepId: this.id,
            choiceMade,
            choices: this.settings.choices.map(c => ({
                id: c.id,
                choiceText: c.choiceText,
                selected: choiceId === c.id,
                correct: (
                    !choiceMade ? null : // If the user hasn't picked a choice yet, don't return a correctness
                    this.settings.correctChoice === undefined ? null : // If there is "no right answer", don't return a correctness
                    c.id === choiceId ? (this.settings.correctChoice === c.id) : // The user chose this answer, and it's correct.
                    (this.settings.correctChoice === c.id) ? true :
                    null // This answer wasn't selected and is not correct.
                ),
            })),
        };
    }

    protected async _handleResponse(data: MultipleChoiceStepResponseRequest) {
        if (!this.isChoiceIdValid(data.choiceId)) {
            throw new SafeError("Invalid choice.");
        }
        await this.setVar(this.choiceVar, data.choiceId);
        await this.pushUiUpdate();
    }

    /** Has the user selected a choice yet? */
    public get isComplete() {
        const choiceId = this.getVar(this.choiceVar);
        return choiceId && this.isChoiceIdValid(choiceId);
    }
}
