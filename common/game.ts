// When users are playing the game, the scenario runs as a series of steps
// (the steps make up the "script"). Each step has a UI state.

export enum GameUserRole {
    // For now these roles are hard coded, and are the same in all scenarios
    Doomsayer = 'D',
    Wayfinder = 'W',
    Burdened = 'B',
    Interpreter = 'I',
    Scientician = 'S',
}
export type RoleSet = GameUserRole[]|'all';

export enum StepType {
    Unknown = '?',
    MessageStep = 'm',
    FreeResponse = 'fr',
}

interface UiState {
    type: StepType,
    stepId: number,
}
export interface MessageStepUiState extends UiState {
    type: StepType.MessageStep;
    message: string;
    forRoles: RoleSet;
}
export interface FreeResponseStepUiState extends UiState {
    type: StepType.FreeResponse;
    multiline: boolean;
    complete: boolean; // Has a value been entered by the user already?
    value: string; // The value the user entered, if any
}
export type AnyUiState = (
    |MessageStepUiState
    |FreeResponseStepUiState
    |null
);
