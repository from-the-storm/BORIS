import { StepType } from "../../../common/game";
import { Step } from "../step";
import { SafeError } from "../../routes/api-utils";

export class TargetStep extends Step {
    public static readonly stepType: StepType = StepType.Internal;
    readonly settings: {
        name: string,
    };

    async run() {}

    protected parseConfig(config: any): any {
        if (typeof config.name !== 'string') {
            throw new SafeError(`A target step must have a unique 'name' parameter specifying its name.`);
        }
        if (this.ifCondition !== undefined) {
            throw new SafeError(`A target step cannot have an 'if' condition.`);
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
