import { StepType, ProgressStepUiState } from "../../../common/game";
import { Step } from "../step";
import { SafeError } from "../../routes/api-utils";

export class ProgressStep extends Step {
    public static readonly stepType: StepType = StepType.ProgressStep;
    readonly settings: {
        percentage: number;
        messageHTML: string;
    };

    async run() {}

    protected parseConfig(config: any): ProgressStep['settings'] {
        if (typeof config.message !== 'string') {
            throw new SafeError(`Progress steps must have a 'message' parameter.`);
        }
        if (typeof config.percent !== 'number') {
            throw new SafeError(`Progress steps must have a numeric 'percent' parameter.`);
        }
        return {
            messageHTML: config.message,
            percentage: config.percent,
        };
    }

    getUiState(): ProgressStepUiState {
        return {
            type: StepType.ProgressStep,
            stepId: this.id,
            messageHTML: this.settings.messageHTML,
            percentage: this.settings.percentage,
        };
    }

    public get isComplete() { return true; }
}
