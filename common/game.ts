// When users are playing the game, the scenario runs as a series of steps
// (the steps make up the "script"). Each step has a UI state.

export enum StepType {
    Unknown = '?',
    Internal = 'i', // Any step type that should never visibly appear in the UI
    MessageStep = 'm',
    FreeResponse = 'fr',
    MultipleChoice = 'mc',
    BulletinStep = 'b',
    ProgressStep = 'p',
    MapStep = 'ma',
    FinishLineStep = 'fin',
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
    multiline: boolean;
    complete: boolean; // Has a value been entered by the user already?
    value: string; // The value the user entered, if any
    invalidGuesses: string[]; // Past values entered by the user that weren't acceptable
}
export interface MultipleChoiceStepUiState extends UiState {
    type: StepType.MultipleChoice;
    choiceMade: boolean;
    choices: {id: string, choiceText: string, selected: boolean, correct: boolean|null}[];
}
export interface BulletinStepUiState extends UiState {
    type: StepType.BulletinStep;
    bulletinHTML: string;
}
export interface ProgressStepUiState extends UiState {
    type: StepType.ProgressStep;
    percentage: number;
    messageHTML: string;
}
export interface MapStepUiState extends UiState {
    type: StepType.MapStep;
    latitude: number;
    longitude: number;
    zoomLevel: number;
    messageHTML: string;
}
export interface FinishLineStepUiState extends UiState {
    type: StepType.FinishLineStep;
}
export type AnyUiState = (
    |MessageStepUiState
    |FreeResponseStepUiState
    |MultipleChoiceStepUiState
    |BulletinStepUiState
    |ProgressStepUiState
    |MapStepUiState
    |FinishLineStepUiState
    |null
);
