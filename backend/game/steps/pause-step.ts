import { StepType } from "../../../common/game";
import { Step } from "../step";
import { GameVar, GameVarScope } from "../vars";
import { SafeError } from "../../routes/api-utils";

export class PauseStep extends Step {
    public static readonly stepType: StepType = StepType.Internal;
    readonly settings: {
        for: number,
    };
    public static readonly isDone: GameVar<boolean> = {key: 'done', scope: GameVarScope.Step, default: false};

    async run() {
        await this.sleep('for', this.settings.for * 1000);
        await this.setVar(PauseStep.isDone, true);
    }

    protected parseConfig(config: any): any {
        if (typeof config.for !== 'number') {
            throw new SafeError(`A pause step must have a 'for' parameter specifying the number of seconds to pause.`);
        }
        return config;
    }

    getUiState(): null {
        return null;
    }

    public get isComplete() {
        return this.getVar(PauseStep.isDone);
    }
}
