import {Record} from 'immutable';
import {AnyAction, Dispatch} from 'redux';
import {UserStateActions as Actions} from './user-state-actions';

/**
 * State of the user (is the user logged in, etc.)
 */
export class UserState extends Record({
    /** Is the user logged in? */
    isLoggedIn: false,
    name: "Anonymous User",
    email: "",
}) {
    // ...
}

/**
 * Reducer that maintains the state of the user (is the user logged in, etc.)
 */
export function userStateReducer(state?: UserState, action?: AnyAction): UserState {

    if (state === undefined) {
        return new UserState({
        });
    }

    switch (action.type) {
    case Actions.LOGIN_USER:
        // User has logged in:
        return state.merge({
            isLoggedIn: true,
            name: action.name,
            email: action.email,
        });
    default:
        return state;
    }
}
