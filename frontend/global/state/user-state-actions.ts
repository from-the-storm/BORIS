import {Dispatch} from 'redux';

//// User State Actions

export enum UserStateActions {
    // G_US prefix means Global User State
    LOGIN_USER = 'G_US_LOGIN_USER',
}
const Actions = UserStateActions;

//// Action Creators

/**
 * Login the user with the given email address
 */
export function loginUser(userEmail: string) {
    return (dispatch: Dispatch<{}>, getState: () => {}) => {
        dispatch({
            type: Actions.LOGIN_USER,
            name: "Braden",
            email: "braden@apocalypsemadeeasy.com",
        });
        return Promise.resolve();
    };
}
