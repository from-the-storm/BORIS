import { StepType, BulletinStepUiState } from "../../../common/game";
import { Step } from "../step";
import { SafeError } from "../../routes/api-utils";

export class BulletinStep extends Step {
    public static readonly stepType: StepType = StepType.BulletinStep;
    readonly settings: {
        bulletinHTML: string,
    };

    async run() {}

    protected parseConfig(config: any): BulletinStep['settings'] {
        if (typeof config.html !== 'string') {
            throw new SafeError(`Bulletin steps must have an 'html' parameter.`);
        }
        return {bulletinHTML: config.html};
    }

    getUiState(): BulletinStepUiState {
        return {
            type: StepType.BulletinStep,
            stepId: this.id,
            bulletinHTML: this.settings.bulletinHTML,
        };
    }

    public get isComplete() { return true; }
}
