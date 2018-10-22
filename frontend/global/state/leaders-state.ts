import { Record, List } from 'immutable';
import { LeadersStateActions as Actions } from './leaders-state-actions';
import { LeaderboardEntry } from '../../../common/api';
import { AnyAction } from '../actions';

/**
 * State of the leaderboard
 */
export class LeadersState extends Record({
    leaders: List<LeaderboardEntry>(),
}) {
    // ...
}

/**
 * Reducer that maintains the state of the leaderboards
 */
export function leadersStateReducer(state?: LeadersState, action?: AnyAction): LeadersState {

    if (state === undefined) {
        return new LeadersState({});
    }
    
    switch (action.type) {
    case Actions.UPDATE_LEADERBOARDS:
        return state.set('leaders', List(action.leaders));
    default:
        return state;
    }
}
