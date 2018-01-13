import {Record} from 'immutable';
import {AnyAction, Dispatch} from 'redux';

import {TeamStateActions as Actions} from './team-state-actions';
import {UserStateActions} from './user-state-actions';

/**
 * State of the team (has the user joined a team, etc.)
 */
export class TeamState extends Record({
    /** If the user has successfully joined a team, this is the team code. */
    teamCode: null as string|null,
    teamName: "NO TEAM",
    isTeamCaptain: false,
    otherTeamMembers: [] as Array<{name: string, id: number, online: boolean, isCaptain: boolean}>,
}) {
    get hasJoinedTeam(): boolean {
        return this.teamCode !== null;
    }
}

/**
 * Reducer that maintains the state of the team in relation to the current user
 */
export function teamStateReducer(state?: TeamState, action?: AnyAction): TeamState {

    if (state === undefined) {
        return new TeamState({
        });
    }

    switch (action.type) {
    case Actions.JOIN_TEAM:
        return state.merge({
            teamCode: action.teamCode,
            teamName: action.teamName,
            isTeamCaptain: action.isTeamCaptain,
            otherTeamMembers: action.otherTeamMembers,
        });
    case Actions.LEAVE_TEAM:
        // User has left a team (they're still associated with that team, just not "currently" online for that team):
        return state.clear();
    case UserStateActions.LOGOUT:
        // If the user has logged out, reset the whole team state:
        return state.clear();
    default:
        return state;
    }
}
