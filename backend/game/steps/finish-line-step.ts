import { StepType, FinishLineStepUiState } from "../../../common/game";
import { Step } from "../step";

/**
 * If the team gets to this point, consider the scenario complete and
 * save it as a completed game, but continue the sript for some
 * post-game review and storyline.
 *
 * Note that this step itself is mostly a no-op, and the actual
 * implementation that makes it work is in GameManager.runCurrentSteps()
 */
export class FinishLineStep extends Step {
    public static readonly stepType: StepType = StepType.FinishLineStep;
    readonly settings: {};

    async run() {}

    protected parseConfig(config: any): any {
        return config;
    }

    getUiState(): FinishLineStepUiState {
        return {
            type: StepType.FinishLineStep,
            stepId: this.id,
        };
    }

    public get isComplete() {
        return true;
    }
}
