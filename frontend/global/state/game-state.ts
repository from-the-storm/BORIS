import {Record, List} from 'immutable';
import {Dispatch} from 'redux';

import {GameStateActions as Actions} from './game-state-actions';
import {TeamStateActions} from './team-state-actions';
import {UserStateActions} from './user-state-actions';
import { AnyAction } from '../actions';
import { AnyUiState } from '../../../common/game';

/**
 * State of the game (has the game started, which scenario is being played, etc.)
 */
export class GameState extends Record({
    /** Is this team currently playing a game? */
    isActive: false,
    isReviewingGame: false, // Once the game is finished, the script/story may continue a bit, so we set isActive false but isReviewingGame true until the user quits
    gameId: null as number|null,
    scenarioId: 0,
    scenarioName: "Unknown scenario",
    uiState: List<AnyUiState>(),
    uiUpdateSeqId: 0,
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
    case Actions.GAME_STATUS_CHANGED:
        if (state.isActive || state.isReviewingGame) {
            // We are currently in a game.
            if (action.newStatus.gameId !== state.gameId) {
                // Except the game ID has changed !?
                // This should never happen, but if it does, treat it like starting a new game:
                return state.clear().merge({
                    isActive: true,
                    gameId: action.newStatus.gameId,
                    scenarioId: action.newStatus.scenarioId,
                    scenarioName: action.newStatus.scenarioName,
                });
            }
            if (action.newStatus.isFinished) {
                // The user has completed the game, but there may still be more to the story
                // so we enter review mode.
                return state.merge({
                    isActive: false,
                    isReviewingGame: true,
                });
            } else if (!action.newStatus.isActive) {
                // The game was abandoned.
                return state.clear();
            } else {
                // No change
                return state;
            }
        } else {
            // We are not currently in a game.
            if (action.newStatus.isActive) {
                // But we should be - a new game has started:
                return state.clear().merge({
                    isActive: true,
                    gameId: action.newStatus.gameId,
                    scenarioId: action.newStatus.scenarioId,
                    scenarioName: action.newStatus.scenarioName,
                });
            } else {
                return state;
            }
        }
    case Actions.SET_UI_STATE:
        return state.merge({
            uiState: List<AnyUiState>(action.state),
            uiUpdateSeqId: action.uiUpdateSeqId,
        })
    case Actions.UPDATE_STEP_UI_STATE:
        // Always call this action via the updateStepUiState() action creator, so it can verify that uiUpdateSeqId is continuous
        for (let i = state.uiState.size; i < action.stepIndex; i++) {
            // If we're jumping ahead in the script, the server will fill in the missing entries with NULL but we'll fill them in with UNDEFINED.
            // Fix that by filling them with NULL now.
            state = state.setIn(['uiState', i], null);
        }
        return state.setIn(['uiState', action.stepIndex], action.state).set('uiUpdateSeqId', action.uiUpdateSeqId);
    case Actions.REVIEW_COMPLETE:
        return state.clear();
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
