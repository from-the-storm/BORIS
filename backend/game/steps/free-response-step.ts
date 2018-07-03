import { FreeResponseStepUiState, StepType } from "../../../common/game";
import { FreeResponseStepResponseRequest } from "../../../common/api";
import { SafeError } from "../../routes/api-utils";
import { Step } from "../step";
import { GameVar, GameVarScope } from "../vars";

export class FreeResponseStep extends Step {
    public static readonly stepType: StepType = StepType.FreeResponse;
    readonly settings: {key: string};

    async run() {}

    protected parseConfig(config: any): any {
        if (typeof config.key !== 'string' || !config.key) {
            throw new SafeError("Free Response step must have a key defined (e.g. 'key: userGuess').");
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
