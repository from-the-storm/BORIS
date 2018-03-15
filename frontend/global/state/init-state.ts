import {Record} from 'immutable';
import {AnyAction, Dispatch} from 'redux';
import {InitStateActions} from './init-state-actions';
import { LoadingState } from '../../loading/loading-state';

/**
 * State of the app's initialization - has status been loaded from the server?
 */
export class InitState extends Record({
    /** Has initial data been loaded from the server? */
    initState: LoadingState.LOADING,
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
        return state.set('initState', LoadingState.READY);
    case InitStateActions.FAILED:
        return state.set('initState', LoadingState.FAILED);
    default:
        return state;
    }
}
