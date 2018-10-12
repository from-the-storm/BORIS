import {Dispatch} from 'redux';
import { OtherTeamMember } from '../../../common/models';
import { callApi } from '../../api';
import { LEAVE_TEAM, GET_TEAM_MARKET_VARS, MarketStatus } from '../../../common/api';

//// Team State Actions

export enum TeamStateActions {
    // G_TS prefix means Global Team State
    LEAVE_TEAM = 'G_TS_LEAVE_TEAM', // The user is no longer on a team
    TEAM_MEMBERS_CHANGED = 'G_TS_TEAM_CHANGED', // The members on this team, or the user's admin status, has changed.
    JOIN_TEAM = 'G_TS_JOIN_TEAM', // The user is now on a team
    UPDATE_MARKET_DATA = 'G_TS_UPDATE_MARKET_DATA', // Update vars that affect the market (other than saltines)
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
interface UpdateMarketData {
    type: TeamStateActions.UPDATE_MARKET_DATA;
    saltinesBalance: number;
    saltinesEarnedAllTime: number;
    marketStatus: MarketStatus;
}

export type TeamStateActionsType = LeaveTeamAction|JoinTeamAction|TeamMembersChangedAction|UpdateMarketData;

//// Action Creators

export function leaveTeam() {
    return async (dispatch: Dispatch<{}>, getState: () => {}) => {
        await callApi(LEAVE_TEAM, {});
        dispatch<TeamStateActionsType>({type: Actions.LEAVE_TEAM});
    };
}

/** Asynchronously update the data about how we display the marker */
export function updateMarketVars() {
    return async (dispatch: Dispatch<{}>, getState: () => {}) => {
        const data = await callApi(GET_TEAM_MARKET_VARS, {});
        dispatch<TeamStateActionsType>({
            type: Actions.UPDATE_MARKET_DATA,
            saltinesBalance: data.saltinesBalance,
            saltinesEarnedAllTime: data.saltinesEarnedAllTime,
            marketStatus: data.status,
        });
    };
}
