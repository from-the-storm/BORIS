import {Record} from 'immutable';
import {Dispatch} from 'redux';
import {UserStateActions} from '../global/state/user-state-actions';
import {TeamStateActions} from '../global/state/team-state-actions';
import {Actions} from './registration-state-actions';
import { AnyAction } from '../global/actions';

export const enum Mode {
    Home,
    Register,
    Login,
    JoinTeam,
    CreateTeam,
    ReadyToPlay,
    Logout,
}

/**
 * State of the registration views (login, register, join team, etc.)
 */
export class RegistrationState extends Record({
    /** Is the user logged in? */
    mode: Mode.Home,
    /* If the user is trying to join a team but hasn't fully confirmed that yet: */
    potentialTeam: null as null|{
        code: string,
        name: string,
        error: 'full'|'invalid'|null,
        otherTeamMemberNames: Array<{name: string}>
    },
}) {
    // ...
}

/**
 * Reducer that maintains the state of the registration app
 */
export function registrationStateReducer(state?: RegistrationState, action?: AnyAction): RegistrationState {

    if (state === undefined) {
        return new RegistrationState({});
    }
    
    switch (action.type) {
    case Actions.SHOW_HOME:
        return state.set('mode', Mode.Home);
    case Actions.SHOW_LOGIN:
        return state.set('mode', Mode.Login);
    case Actions.SHOW_LOGOUT:
        return state.set('mode', Mode.Logout);
    case Actions.SHOW_REGISTER:
        return state.set('mode', Mode.Register);
    case Actions.SHOW_JOIN_TEAM:
    case UserStateActions.LOGIN:
        // User has logged in - pick a team:
        return state.set('mode', Mode.JoinTeam);
    case Actions.SHOW_CREATE_TEAM:
        return state.set('mode', Mode.CreateTeam);
    case Actions.SHOW_CHOOSE_SCENARIO:
    case TeamStateActions.JOIN_TEAM:
        return state.set('mode', Mode.ReadyToPlay);
    case UserStateActions.LOGOUT:
    // User has logged out:
        return state.set('mode', Mode.Home);
    case TeamStateActions.LEAVE_TEAM:
        return state.set('mode', Mode.JoinTeam);
    default:
        return state;
    }
}
