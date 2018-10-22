import { Dispatch } from 'redux';

import { LeaderboardEntry, GET_LEADERS } from "../../../common/api";
import { callApi } from '../../api';

//// Leaders State Actions

export enum LeadersStateActions {
    // G_LBS prefix means Global Leader Boards State
    UPDATE_LEADERBOARDS = 'G_LBS_UPDATE',
}

interface UpdateLeaderboardsAction {
    type: LeadersStateActions.UPDATE_LEADERBOARDS,
    leaders: LeaderboardEntry[],
}
export type LeadersStateActionsType = UpdateLeaderboardsAction;


/** Asynchronously update the leaderboard data */
export function updateLeaderboards() {
    return async (dispatch: Dispatch<{}>, getState: () => {}) => {
        const data = await callApi(GET_LEADERS, {});
        dispatch<LeadersStateActionsType>({
            type: LeadersStateActions.UPDATE_LEADERBOARDS,
            leaders: data.leaders,
        });
    };
}
