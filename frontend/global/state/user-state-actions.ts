import {Dispatch} from 'redux';

//// User State Actions

export enum UserStateActions {
    // G_US prefix means Global User State
    LOGIN = 'G_US_LOGIN',
    LOGOUT = 'G_US_LOGOUT',
}
const Actions = UserStateActions;

//// Action Creators

/**
 * Log the user out
 */
export function logoutUser() {
    return (dispatch: Dispatch<{}>, getState: () => {}) => {
        return fetch('/auth/logout', {
            method: 'get',
            credentials: 'include',
        }).then(response => {
            if (response.ok) {
                dispatch({type: Actions.LOGOUT,});
            } else {
                throw new Error('Failed to log out.');
            }
        });
    };
}
