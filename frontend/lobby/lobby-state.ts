import {Record} from 'immutable';
import {AnyAction, Dispatch} from 'redux';
import {UserStateActions} from '../global/state/user-state-actions';
import {TeamStateActions} from '../global/state/team-state-actions';

export const enum Mode {
    ChooseScenario,
}

/**
 * State of the lobby views (choose secnario, manage team, market, etc.)
 */
export class LobbyState extends Record({
    /** Is the user logged in? */
    mode: Mode.ChooseScenario,
}) {
    // ...
}

/**
 * Reducer that maintains the state of the lobby app
 */
export function lobbyStateReducer(state?: LobbyState, action?: AnyAction): LobbyState {

    if (state === undefined) {
        return new LobbyState({});
    }
    
    switch (action.type) {
    case UserStateActions.LOGOUT:
    case TeamStateActions.LEAVE_TEAM:
        return state.clear();
    default:
        return state;
    }
}
