import {Dispatch} from 'redux';
import { callApi } from '../../api';

//// User State Actions

export enum UserStateActions {
    // G_US prefix means Global User State
    LOGIN = 'G_US_LOGIN',
    LOGOUT = 'G_US_LOGOUT',
}
const Actions = UserStateActions;

interface LoginActionType {
    type: UserStateActions.LOGIN;
    firstName: string;
    id: number;
}
interface LogoutActionType {
    type: UserStateActions.LOGOUT;
}

export type UserStateActionsType = LoginActionType|LogoutActionType;

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
                dispatch<UserStateActionsType>({type: Actions.LOGOUT,});
            } else {
                throw new Error('Failed to log out.');
            }
        });
    };
}
