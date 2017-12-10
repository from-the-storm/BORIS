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
 * Login the user with the given email address
 */
export function loginUser(userEmail: string) {
    return (dispatch: Dispatch<{}>, getState: () => {}) => {
        return fetch('/auth/request-login', {
            method: 'post',
            headers: new Headers({"Content-Type": "application/json"}),
            body: JSON.stringify({
                email: userEmail,
            }),
        }).then(response => {
            if (response.ok) {
                dispatch({
                    type: Actions.LOGIN,
                    firstName: "Braden",
                });
            } else {
                throw new Error('Failed to request a login email.');
            }
        });
    };
}

/**
 * Login the user with the given email address
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
