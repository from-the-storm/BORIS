import { MessageStepUiState, StepType, GameUserRole } from "../../../common/game";
import { Step } from "../step";
import { GameVar, GameVarScope } from "../vars";

export class MessageStep extends Step {
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
