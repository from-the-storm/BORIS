import { MessageStepUiState, StepType } from "../../../common/game";
import { Step } from "../step";
import { GameVar, GameVarScope } from "../vars";
import { SafeError } from "../../routes/api-utils";

export class MessageStep extends Step {
    public static readonly stepType: StepType = StepType.MessageStep;
    readonly settings: {
        messages: string[],
        character?: string,
    };
    public static readonly numMessagesShown: GameVar<number> = {key: 'show', scope: GameVarScope.Step, default: 0};
    get numMessagesShown() { return this.getVar(MessageStep.numMessagesShown); }

    async run() {
        // First, evaluate and cache any JS expressions:
        for (let i = 0; i < this.settings.messages.length; i++) {
            const msgRaw = this.settings.messages[i];
            if (this.isJSExpression(msgRaw)) {
                const cacheVar: GameVar<string> = {key: `c${i}`, scope: GameVarScope.Step, default: ''};
                await this.setVar(cacheVar, oldVal => String(this.safeEvalScriptExpression(msgRaw[0])));
            }
        }
        // Now, slowly reveal each message to the user, after a short delay:
        while (this.numMessagesShown < this.settings.messages.length) {
            await this.sleep(`m${this.numMessagesShown}`, 1750);
            await this.setVar(MessageStep.numMessagesShown, n => n + 1);
            this.pushUiUpdate();
        }
    }

    /**
     * Determine if the specified message object is in fact a JavaScript expression.
     * The syntax for a JS expression in a messages looks like:
     * messages:
     * - normal message text
     * - [ JS code here ]
     */
    private isJSExpression(messageValue: any) {
        return (Array.isArray(messageValue) && messageValue.length === 1);
    }

    /**
     * Get the messages of this step, converting messages that contain JavaScript
     * expressions to strings
     **/
    protected get messagesEvaluated(): string[] {
        return this.settings.messages.map((msgRaw, idx) => {
            if (this.isJSExpression(msgRaw)) {
                const cacheVar: GameVar<string> = {key: `c${idx}`, scope: GameVarScope.Step, default: ''};
                return this.getVar(cacheVar);
            } else {
                return msgRaw;
            }
        });
    }

    protected parseConfig(config: any): any {
        if (!Array.isArray(config.messages)) {
            throw new SafeError("Message step must have a list of messages defined.");
        }
        if (config.character && typeof config.character !== 'string') {
            throw new SafeError(`Invalid character: ${config.character}`);
        }
        return config;
    }

    getUiState(): MessageStepUiState {
        if (this.numMessagesShown === 0) {
            return null;
        }
        return {
            type: StepType.MessageStep,
            stepId: this.id,
            messages: this.messagesEvaluated.slice(0, this.numMessagesShown),
            ...(this.settings.character ? {character: this.settings.character} : {})
        };
    }

    public get isComplete() {
        return this.numMessagesShown >= this.settings.messages.length;
    }
}
