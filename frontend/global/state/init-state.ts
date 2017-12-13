import {Record} from 'immutable';
import {AnyAction, Dispatch} from 'redux';
import {InitStateActions} from './init-state-actions';

/**
 * State of the app's initialization - has status been loaded from the server?
 */
export class InitState extends Record({
    /** Has initial data been loaded from the server? True if yes, False if error, undefined if in progress */
    initCompleted: undefined as undefined|true|false,
}) {
    // ...
}

/**
 * Reducer that maintains the state of the app's initialization
 */
export function initStateReducer(state?: InitState, action?: AnyAction): InitState {

    if (state === undefined) {
        return new InitState();
    }

    switch (action.type) {
    case InitStateActions.SUCCEEDED:
        return state.set('initCompleted', true);
    case InitStateActions.FAILED:
        return state.set('initCompleted', false);
    default:
        return state;
    }
}
