import {Record, List} from 'immutable';
import {Dispatch} from 'redux';

import {GameStateActions as Actions} from './game-state-actions';
import {TeamStateActions} from './team-state-actions';
import {UserStateActions} from './user-state-actions';
import { AnyAction } from '../actions';
import { OtherTeamMember } from '../../../common/models';
import { AnyUiState } from '../../../common/game';

/**
 * State of the game (has the game started, which scenario is being played, etc.)
 */
export class GameState extends Record({
    /** Is this team currently playing a game? */
    isActive: false,
    scenarioId: 0,
    scenarioName: "Unknown scenario",
    uiState: List<AnyUiState>(),
    uiUpdateSequence: -1,
    // ^ Whenever the server pushes out UI updates, they include a 'sequence number'.
    // It should always be increased by one; if not, we missed some updates and
    // should retrieve the whole list from the server from scratch.
}) {

}

/**
 * Reducer that maintains the state of the game
 */
export function gameStateReducer(state?: GameState, action?: AnyAction): GameState {

    if (state === undefined) {
        return new GameState({
        });
    }

    switch (action.type) {
    case Actions.START_GAME:
        return state.merge({
            isActive: true,
            scenarioId: action.scenarioId,
            scenarioName: action.scenarioName,
        });
    case Actions.SET_UI_STATE:
        return state.merge({
            uiState: List<AnyUiState>(action.state),
            uiUpdateSequence: action.updateSequence,
        })
    case Actions.UPDATE_STEP_UI_STATE:
        // Always call this action via the updateStepUiState() action creator, so it can verify that uiUpdateSequence is continuous
        return state.setIn(['uiState', action.stepIndex], action.state).set('uiUpdateSequence', action.updateSequence);
    case Actions.ABANDON_GAME:
        // The team has abandoned the game:
        return state.clear();
    case TeamStateActions.LEAVE_TEAM:
    case UserStateActions.LOGOUT:
        // User has left a team or logged out, so they're definitely no longer playing a game:
        return state.clear();
    default:
        return state;
    }
}
