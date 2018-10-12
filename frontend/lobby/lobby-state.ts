import {Record, List} from 'immutable';
import {Dispatch} from 'redux';
import {UserStateActions} from '../global/state/user-state-actions';
import {TeamStateActions} from '../global/state/team-state-actions';
import { Actions } from './lobby-state-actions';
import { AnyAction } from '../global/actions';
import { LoadingState } from '../loading/loading-state';
import { Scenario } from '../../common/models';
import { GameStateActions } from '../global/state/game-state-actions';

export const enum Mode {
    ChooseScenario,
    TeamDetails,
    PreLaunch, // A user has chosen to start a particular scenario; this screen will confirm that their team is all online.
    Market,
}

/**
 * State of the lobby views (choose scenario, manage team, market, etc.)
 */
export class LobbyState extends Record({
    scenarios: List<Scenario>(),
    scenariosState: LoadingState.NOT_LOADING,
    selectedScenario: null as number|null,
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
    case Actions.SHOW_SCENARIOS_LIST:
    case GameStateActions.ABANDON_GAME:
    case GameStateActions.REVIEW_COMPLETE:
        return state.merge({
            selectedScenario: null,
            mode: Mode.ChooseScenario,
        });
    case Actions.SHOW_MARKET:
        return state.set('mode', Mode.Market);
    case Actions.SHOW_SCENARIO_DETAILS:
        return state.set('selectedScenario', action.scenarioId);
    case Actions.SHOW_PRE_LAUNCH_SCREEN:
        return state.merge({
            mode: Mode.PreLaunch,
            selectedScenario: action.scenarioId,
        });
    case Actions.SHOW_TEAM_DETAILS:
        return state.set('mode', Mode.TeamDetails);
    case UserStateActions.LOGOUT:
    case TeamStateActions.LEAVE_TEAM:
        return state.clear();
    default:
        return state;
    }
}
