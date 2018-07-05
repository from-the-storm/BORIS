// When users are playing the game, the scenario runs as a series of steps
// (the steps make up the "script"). Each step has a UI state.

export enum StepType {
    Unknown = '?',
    Internal = 'i', // Any step type that should never visibly appear in the UI
    MessageStep = 'm',
    FreeResponse = 'fr',
    MultipleChoice = 'mc',
}

interface UiState {
    type: StepType,
    stepId: number,
}
export interface MessageStepUiState extends UiState {
    type: StepType.MessageStep;
    messages: string[];
    character?: string;
}
export interface FreeResponseStepUiState extends UiState {
    type: StepType.FreeResponse;
    //multiline: boolean; // Do we need multiline support in the future?
    complete: boolean; // Has a value been entered by the user already?
    value: string; // The value the user entered, if any
}
export interface MultipleChoiceStepUiState extends UiState {
    type: StepType.MultipleChoice;
    choiceMade: boolean;
    choices: {id: string, choiceText: string, selected: boolean, correct: boolean|null}[];
}
export type AnyUiState = (
    |MessageStepUiState
    |FreeResponseStepUiState
    |MultipleChoiceStepUiState
    |null
);
