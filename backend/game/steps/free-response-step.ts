import { FreeResponseStepUiState, StepType } from "../../../common/game";
import { FreeResponseStepResponseRequest } from "../../../common/api";
import { SafeError } from "../../routes/api-utils";
import { Step } from "../step";
import { GameVar, GameVarScope } from "../vars";

type SettingsType = {key: string, multiline: boolean, allowed?: string[]};

export class FreeResponseStep extends Step {
    public static readonly stepType: StepType = StepType.FreeResponse;
    readonly settings: SettingsType;

    async run() {}

    protected parseConfig(config: any): any {
        if (typeof config.key !== 'string' || !config.key) {
            throw new SafeError("Free Response step must have a key defined (e.g. 'key: userGuess').");
        }
        const result: SettingsType = {
            key: config.key,
            multiline: Boolean(config.multiline), // Default to false if undefined
        };
        if (config.allowed !== undefined) {
            if (!Array.isArray(config.allowed)) {
                throw new SafeError("Free response step 'allowed' parameter must be a list/array of strings");
            }
            result.allowed = config.allowed.map((x: string) => x.toLowerCase());
        }
        return result;
    }

    get valueVar(): GameVar<string> {
        return {key: this.settings.key, scope: GameVarScope.Game, default: ''};
    }

    get invalidGuessesVar(): GameVar<string[]> {
        return {key: 'invalidGuesses', scope: GameVarScope.Step, default: []};
    }

    getUiState(): FreeResponseStepUiState {
        const value = this.getVar(this.valueVar);
        return {
            type: StepType.FreeResponse,
            stepId: this.id,
            complete: value !== '',
            multiline: this.settings.multiline,
            invalidGuesses: this.getVar(this.invalidGuessesVar),
            value,
        };
    }

    protected async _handleResponse(data: FreeResponseStepResponseRequest) {
        let value = data.value ? data.value.trim() : '';
        if (value === '' || (this.settings.allowed !== undefined && this.settings.allowed.indexOf(data.value.toLowerCase()) === -1)) {
            // The value they entered was not accepted:
            await this.setVar(this.invalidGuessesVar, invalidGuesses => invalidGuesses.concat(data.value));
        } else {
            // The value was accepted:
            await this.setVar(this.valueVar, data.value);
        }
        await this.pushUiUpdate();
    }

    public get isComplete() {
        return this.getVar(this.valueVar) !== '';
    }
}
