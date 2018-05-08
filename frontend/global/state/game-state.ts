import {Record} from 'immutable';
import {Dispatch} from 'redux';

import {GameStateActions as Actions} from './game-state-actions';
import {TeamStateActions} from './team-state-actions';
import {UserStateActions} from './user-state-actions';
import { AnyAction } from '../actions';
import { OtherTeamMember } from '../../../common/models';

/**
 * State of the game (has the game started, which scenario is being played, etc.)
 */
export class GameState extends Record({
    /** Is this team currently playing a game? */
    isActive: false,
    scenarioId: 0,
    scenarioName: "Unknown scenario",
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
