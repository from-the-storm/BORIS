import { Record } from 'immutable';
import { UserStateActions } from '../global/state/user-state-actions';
import { AnyAction } from '../global/actions';
import { RpcClientConnectionStatus, Actions } from './rpc-client-actions';

/**
 * State of the websocket connection to the server
 */
export class RpcClientState extends Record({
    status: RpcClientConnectionStatus.NotConnected as RpcClientConnectionStatus,
    // Do we _want_ an RPC connection to be active now? (is the user logged in?)
    wantConnection: false,
}) {
    // ...
}

/**
 * Reducer that updates the state of the websocket connection
 */
export function rpcClientStateReducer(state?: RpcClientState, action?: AnyAction): RpcClientState {

    if (state === undefined) {
        return new RpcClientState({});
    }
    
    switch (action.type) {
    case Actions.WSCS_AVAILABLE:
        return state.set('status', RpcClientConnectionStatus.Connected);
    case Actions.WSCS_UNAVAILABLE:
        return state.set('status', action.reason);
    case UserStateActions.LOGIN:
        return state.set('wantConnection', true);
    case UserStateActions.LOGOUT:
        return state.set('wantConnection', false);
    default:
        return state;
    }
}
