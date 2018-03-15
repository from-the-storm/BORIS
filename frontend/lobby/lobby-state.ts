import {Record, List} from 'immutable';
import {Dispatch} from 'redux';
import {UserStateActions} from '../global/state/user-state-actions';
import {TeamStateActions} from '../global/state/team-state-actions';
import { Actions } from './lobby-state-actions';
import { AnyAction } from '../global/actions';
import { LoadingState } from '../loading/loading-state';
import { Scenario } from '../../backend/db/models';

export const enum Mode {
    ChooseScenario,
}

/**
 * State of the lobby views (choose scenario, manage team, market, etc.)
 */
export class LobbyState extends Record({
    scenarios: List<Scenario>(),
    scenariosState: LoadingState.NOT_LOADING,
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
    case Actions.SCENARIOS_LOADING:
        return state.set('scenariosState', LoadingState.LOADING);
    case Actions.SCENARIOS_LOADED:
        return state.merge({
            scenarios: List(action.scenarios),
            scenariosState: LoadingState.READY,
        });
    case Actions.SCENARIOS_FAILED_TO_LOAD:
        return state.merge({
            scenarios: List<Scenario>(),
            scenariosState: LoadingState.FAILED,
        })
    case UserStateActions.LOGOUT:
    case TeamStateActions.LEAVE_TEAM:
        return state.clear();
    default:
        return state;
    }
}
