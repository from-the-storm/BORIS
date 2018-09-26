import {Dispatch} from 'redux';
import { callApi } from '../../api';
import { PRESURVEY_PROMPT_SEEN } from '../../../common/api';

//// User State Actions

export enum UserStateActions {
    // G_US prefix means Global User State
    LOGIN = 'G_US_LOGIN',
    LOGOUT = 'G_US_LOGOUT',
    SEEN_PRESURVEY_PROMPT = 'G_US_PRESURVEY_PROMPT_SEEN',
}
const Actions = UserStateActions;

interface LoginActionType {
    type: UserStateActions.LOGIN;
    firstName: string;
    id: number;
    hasSeenPreSurveyPrompt: boolean;
}
interface LogoutActionType {
    type: UserStateActions.LOGOUT;
}
// The user has seen the research survey prompt that is shown before they see the list of scenarios
interface SeenPresurveyPromptType {
    type: UserStateActions.SEEN_PRESURVEY_PROMPT;
}

export type UserStateActionsType = LoginActionType|LogoutActionType|SeenPresurveyPromptType;

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

export function markPreSurveySeen() {
    return async (dispatch: Dispatch<{}>, getState: () => {}) => {
        await callApi(PRESURVEY_PROMPT_SEEN, {seen: true});
        dispatch<UserStateActionsType>({type: Actions.SEEN_PRESURVEY_PROMPT});
    };
}
