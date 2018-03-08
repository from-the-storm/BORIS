import {Dispatch} from 'redux';

//// Team State Actions

export enum TeamStateActions {
    // G_TS prefix means Global Team State
    LEAVE_TEAM = 'G_TS_LEAVE_TEAM',
    JOIN_TEAM = 'G_TS_JOIN_TEAM',
}
const Actions = TeamStateActions;

//// Action Creators

function postToApi(path: string, body?: any) {
    return fetch(path, {
        method: 'post',
        credentials: 'include',
        headers: new Headers({"Content-Type": "application/json"}),
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

export function leaveTeam() {
    return async (dispatch: Dispatch<{}>, getState: () => {}) => {
        const response = await postToApi('/auth/team/leave');
        if (response.ok) {
            dispatch({type: Actions.LEAVE_TEAM});
            return true;
        } else {
            throw new Error('Failed to leave team.');
        }
    };
}
