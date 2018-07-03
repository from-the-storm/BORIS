import { MultipleChoiceStepUiState, StepType } from "../../../common/game";
import { MultipleChoiceStepResponseRequest } from "../../../common/api";
import { SafeError } from "../../routes/api-utils";
import { Step } from "../step";
import { GameVar, GameVarScope } from "../vars";

interface MultipleChoiceStepSettings {
    key: string,
    choices: {id: string, choiceText: string}[],
    correctChoice?: string,
};

export class MultipleChoiceStep extends Step {
    public static readonly stepType: StepType = StepType.FreeResponse;
    readonly settings: MultipleChoiceStepSettings;

    async run() {}

    protected parseConfig(config: any): MultipleChoiceStepSettings {
        // Parse yaml config like:
        // - step: choice
        //   key: howfar
        //   correct: halfway
        //   choices:
        //     - halfway: Halfway there
        //     - alone: You said survive alone
        if (typeof config.key !== 'string') {
            throw new SafeError("Multiple step must have an 'key' defined to store the user's choice.");
        }
        if (!Array.isArray(config.choices)) {
            throw new SafeError("Multiple choice step should have an array of choices called 'choices'.");
        }
        let choices: {id: string, choiceText: string}[] = [];
        for (const entry of config.choices) {
            const keys = Object.keys(entry); // Should only be one, e.g. 'halfway'
            if (keys.length != 1) { throw new SafeError("Invalid choice in Multiple Choice step"); }
            choices.push({id: keys[0], choiceText: entry[keys[0]]});
        }
        return {
            key: config.key,
            choices,
            correctChoice: (config.correct && (choices.map(c => c.id).indexOf(config.correct) !== -1)) ? config.correct : undefined,
        }
    }

    get choiceVar(): GameVar<string> {
        return {key: this.settings.key, scope: GameVarScope.Game, default: ''};
    }

    isChoiceIdValid(choiceId: string): boolean {
        for (const choice of this.settings.choices) {
            if (choice.id == choiceId) {
                return true;
            }
        }
        return false;
    }

    getUiState(): MultipleChoiceStepUiState {
        const choiceId = this.getVar(this.choiceVar);
        const choiceMade = this.isComplete;
        return {
            type: StepType.MultipleChoice,
            stepId: this.id,
            choiceMade,
            choices: this.settings.choices.map(c => ({
                id: c.id,
                choiceText: c.choiceText,
                selected: choiceId === c.id,
                correct: (
                    !choiceMade ? null : // If the user hasn't picked a choice yet, don't return a correctness
                    this.settings.correctChoice === undefined ? null : // If there is "no right answer", don't return a correctness
                    c.id === choiceId ? (this.settings.correctChoice === c.id) : // The user chose this answer, and it's correct.
                    (this.settings.correctChoice === c.id) ? true :
                    null // This answer wasn't selected and is not correct.
                ),
            })),
        };
    }

    protected async _handleResponse(data: MultipleChoiceStepResponseRequest) {
        if (!this.isChoiceIdValid(data.choiceId)) {
            throw new SafeError("Invalid choice.");
        }
        await this.setVar(this.choiceVar, data.choiceId);
        await this.pushUiUpdate();
    }

    /** Has the user selected a choice yet? */
    public get isComplete() {
        const choiceId = this.getVar(this.choiceVar);
        return !!(choiceId && this.isChoiceIdValid(choiceId));
    }
}
