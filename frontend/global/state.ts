// This is just a convenience file to make importing the global states/reducers/actions easier.
import {UserState, userStateReducer} from './state/user-state';
export {UserState, userStateReducer} from './state/user-state';
import {TeamState, teamStateReducer} from './state/team-state';
export {TeamState, teamStateReducer} from './state/team-state';

import {RegistrationState} from '../registration/registration-state';

export interface RootState {
    userState: UserState;
    teamState: TeamState;
    registrationState: RegistrationState;
}
