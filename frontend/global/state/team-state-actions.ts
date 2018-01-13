import {Dispatch} from 'redux';

//// Team State Actions

export enum TeamStateActions {
    // G_TS prefix means Global Team State
    LEAVE_TEAM = 'G_TS_LEAVE_TEAM',
    JOIN_TEAM = 'G_TS_JOIN_TEAM',
}
const Actions = TeamStateActions;

//// Action Creators
