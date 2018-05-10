//// Init State Actions

export enum InitStateActions {
    // G_IS prefix means Global Init State
    SUCCEEDED = 'G_IS_SUCCEEDED',
    FAILED = 'G_IS_FAILED',
}
const Actions = InitStateActions;

interface InitStateSucceededAction {
    type: InitStateActions.SUCCEEDED,
}
interface InitStateFailedAction {
    type: InitStateActions.FAILED,
}

export type InitStateActionsType = InitStateSucceededAction|InitStateFailedAction;
