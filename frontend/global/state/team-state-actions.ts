import {Dispatch} from 'redux';
import { OtherTeamMember } from '../../../common/models';
import { callApi } from '../../api';
import { LEAVE_TEAM } from '../../../common/api';

//// Team State Actions

export enum TeamStateActions {
    // G_TS prefix means Global Team State
    LEAVE_TEAM = 'G_TS_LEAVE_TEAM', // The user is no longer on a team
    TEAM_MEMBERS_CHANGED = 'G_TS_TEAM_CHANGED', // The members on this team, or the user's admin status, has changed.
    JOIN_TEAM = 'G_TS_JOIN_TEAM', // The user is now on a team
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
interface TeamMembersChangedAction {
    type: TeamStateActions.TEAM_MEMBERS_CHANGED;
    isTeamAdmin: boolean;
    otherTeamMembers: Array<OtherTeamMember>;
}

export type TeamStateActionsType = LeaveTeamAction|JoinTeamAction|TeamMembersChangedAction;

//// Action Creators

export function leaveTeam() {
    return async (dispatch: Dispatch<{}>, getState: () => {}) => {
        await callApi(LEAVE_TEAM, {});
        dispatch<TeamStateActionsType>({type: Actions.LEAVE_TEAM});
    };
}
