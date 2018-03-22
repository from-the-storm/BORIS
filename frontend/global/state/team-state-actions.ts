import {Dispatch} from 'redux';
import { OtherTeamMember } from '../../../common/models';
import { callApi } from '../../api';
import { LEAVE_TEAM } from '../../../common/api';

//// Team State Actions

export enum TeamStateActions {
    // G_TS prefix means Global Team State
    LEAVE_TEAM = 'G_TS_LEAVE_TEAM',
    JOIN_TEAM = 'G_TS_JOIN_TEAM',
}
const Actions = TeamStateActions;

interface LeaveTeamAction {
    type: TeamStateActions.LEAVE_TEAM;
}
interface JoinTeamAction {
    type: TeamStateActions.JOIN_TEAM;
    teamCode: string;
    teamName: string;
    isTeamAdmin: boolean;
    otherTeamMembers: Array<OtherTeamMember>;
}

export type TeamStateActionsType = LeaveTeamAction|JoinTeamAction;

//// Action Creators

export function leaveTeam() {
    return async (dispatch: Dispatch<{}>, getState: () => {}) => {
        await callApi(LEAVE_TEAM, {});
        dispatch<TeamStateActionsType>({type: Actions.LEAVE_TEAM});
    };
}
