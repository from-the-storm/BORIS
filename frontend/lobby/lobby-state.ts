import {Record, List} from 'immutable';
import {Dispatch} from 'redux';
import {UserStateActions} from '../global/state/user-state-actions';
import {TeamStateActions} from '../global/state/team-state-actions';
import { Actions, ScenariosLoadedAction, Scenario } from './lobby-state-actions';
import { AnyAction } from '../global/actions';

export const enum Mode {
    ChooseScenario,
}

/**
 * State of the lobby views (choose scenario, manage team, market, etc.)
 */
export class LobbyState extends Record({
    scenarios: List<Scenario>(),
    mode: Mode.ChooseScenario as Mode,
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
    case Actions.SCENARIOS_LOADED:
        return state.set('scenarios', List(action.scenarios));
    case UserStateActions.LOGOUT:
    case TeamStateActions.LEAVE_TEAM:
        return state.clear();
    default:
        return state;
    }
}
