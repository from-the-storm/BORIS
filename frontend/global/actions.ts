import { TeamStateActionsType } from './state/team-state-actions';
import { UserStateActionsType } from './state/user-state-actions';
import { InitStateActionsType } from './state/init-state-actions';
import { LobbyStateActionsType } from '../lobby/lobby-state-actions';
import { RegistrationStateActionsType } from '../registration/registration-state-actions';


export type AnyAction = InitStateActionsType|TeamStateActionsType|UserStateActionsType|LobbyStateActionsType|RegistrationStateActionsType;
