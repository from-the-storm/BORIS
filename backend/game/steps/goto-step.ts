import { StepType } from "../../../common/game";
import { Step } from "../step";
import { SafeError } from "../../routes/api-utils";

/**
 * Goto Step: Works together with TargetStep to allow jumping forward in
 * scripts. (Jumping backwards is not allowed for now.)
 *
 * Note that this step itself is mostly a no-op, and the actual
 * implementation that makes it work is in GameManager.computeNextStepForUser()
 */
export class GotoStep extends Step {
    public static readonly stepType: StepType = StepType.Internal;
    readonly settings: {
        name: string,
    };

    async run() {}

    protected parseConfig(config: any): any {
        if (typeof config.name !== 'string') {
            throw new SafeError(`A goto step must have a unique 'name' parameter specifying the target name.`);
        }
        return config;
    }

    getUiState(): null {
        return null;
    }

    public get isComplete() {
        return true;
    }
}
