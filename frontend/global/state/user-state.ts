import {Record} from 'immutable';
import {AnyAction, Dispatch} from 'redux';
import {UserStateActions as Actions} from './user-state-actions';

/**
 * State of the user (is the user logged in, etc.)
 */
export class UserState extends Record({
    /** Is the user logged in? */
    isLoggedIn: false,
    first_name: "Jamie",
    email: "jamie@awalkalypse.test",
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
    case Actions.LOGIN:
        // User has logged in:
        return state.merge({
            isLoggedIn: true,
            first_name: action.first_name,
            email: action.email,
        });
    case Actions.LOGOUT:
        // User has logged out:
        return state.clear();
    default:
        return state;
    }
}
