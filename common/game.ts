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
}
export interface MessageStepUiState extends UiState {
    message: string;
    forRoles: RoleSet;
}
export interface FreeResponseStepUiState extends UiState {
    multiline: boolean;
}
export type AnyUiState = (
    |MessageStepUiState
    |FreeResponseStepUiState
);
