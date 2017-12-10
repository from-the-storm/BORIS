import {Dispatch} from 'redux';

//// Init State Actions

export enum InitStateActions {
    // G_IS prefix means Global Init State
    SUCCEEDED = 'G_IS_SUCCEEDED',
    FAILED = 'G_IS_FAILED',
}
const Actions = InitStateActions;
