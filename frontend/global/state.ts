// This is just a convenience file to make importing the global states/reducers/actions easier.
import {InitState, initStateReducer} from './state/init-state';
export {InitState, initStateReducer} from './state/init-state';
import {UserState, userStateReducer} from './state/user-state';
export {UserState, userStateReducer} from './state/user-state';
import {TeamState, teamStateReducer} from './state/team-state';
export {TeamState, teamStateReducer} from './state/team-state';
import {GameState, gameStateReducer} from './state/game-state';
export {GameState, gameStateReducer} from './state/game-state';

import {RegistrationState} from '../registration/registration-state';
import { LobbyState } from '../lobby/lobby-state';
import { RpcClientState } from '../rpc-client/rpc-client-state';

export interface RootState {
    initState: InitState;
    userState: UserState;
    teamState: TeamState;
    registrationState: RegistrationState;
    lobbyState: LobbyState;
    rpcClientState: RpcClientState;
    gameState: GameState;
}
