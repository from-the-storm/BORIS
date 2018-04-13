import { MiddlewareAPI, Middleware } from "redux";
import Client from 'jsonrpc-websocket-client';
import { RootState } from "../global/state";
import { AnyAction } from "../global/actions";
import { UserStateActions } from "../global/state/user-state-actions";
import { RpcClientConnectionStatus, Actions } from "./rpc-client-actions";

const client = new Client((location.protocol === 'http:' ? 'ws:' : 'wss:') + `//${location.host}/rpc`);

/**
 * Redux middleware that maintains a persistent websocket connection to BORIS,
 * but only when the user's device is online and the state's 'wantConnection'
 * is true. (So we don't bother with a websocket if the user is not logged in,
 * for example.)
 * @param store The redux store
 */
export function rpcClientMiddleware(store: MiddlewareAPI<RootState>) {

    const tryReconnecting = () => {
        // First make sure that we _should_ be connected at this point, and that we're not already trying to connect:
        if (!store.getState().rpcClientState.wantConnection) {
            return; // We are not supposed to be connected right now, so don't even try
        }
        if (client.status !== 'closed') {
            return; // We're already trying to connect ('connecting') or already got connected - no action necessary
        }
        if (!navigator.onLine) {
            // This device is definitely offline, so don't bother trying to connect.
            // The 'online' event handler will try this again once the device is back online.
            return;
        }
        // Try to reconnect:
        client.open();
        // Indicate that we're trying to connect:
        store.dispatch<AnyAction>({type: Actions.WSCS_UNAVAILABLE, reason: RpcClientConnectionStatus.TryingToConnect});
    }

    window.addEventListener('online', tryReconnecting, false);
    window.addEventListener('offline', () => {
        console.log("This device is offline - cannot communicate with BORIS while offline.");
        store.dispatch<AnyAction>({type: Actions.WSCS_UNAVAILABLE, reason: RpcClientConnectionStatus.Offline});
        client.close();
    }, false);

    client.on('open', () => {
        // We could dispatch WSCS_AVAILABLE to change the state to show the connection is open,
        // but it's better to do that below once we get the 'connection_ready' notification from the server.
    });
    client.on('closed', () => {
        // Normally the 'close' event will come after we've chosen to close the connection
        // in which case, rpcClientState.status will already reflect the reason.
        if (store.getState().rpcClientState.status === RpcClientConnectionStatus.Connected) {
            console.error('RPC connection unexpectedly closed');
            store.dispatch<AnyAction>({type: Actions.WSCS_UNAVAILABLE, reason: RpcClientConnectionStatus.NotConnected});
        }
        setTimeout(tryReconnecting, 150); // Try reconnecting (will check if we _should_ first, then try.)
    });

    client.on('notification', (notification: any) => {
        if (notification.method === 'connection_ready' && store.getState().rpcClientState.wantConnection) {
            store.dispatch<AnyAction>({type: Actions.WSCS_AVAILABLE});
            console.log("CONNECTION READY");
        }
        console.log('notification received', notification)
    })
    
    return (next: any) => (action: AnyAction) => {
        if (action.type === Actions.WSCS_UNAVAILABLE) {
            console.log('Action: ' + action.type + ` (${action.reason})`);
        } else {
            console.log('Action: ' + action.type);
        }
        

        const wantedConnection = store.getState().rpcClientState.wantConnection;
        const result = next(action);
        const wantsConnection = store.getState().rpcClientState.wantConnection;

        if (wantsConnection && !wantedConnection) {
            console.log("We want the websocket to be connected now");
            tryReconnecting();
        } else if (!wantsConnection && wantedConnection) {
            console.log("We want the websocket to be DISconnected now");
            store.dispatch<AnyAction>({type: Actions.WSCS_UNAVAILABLE, reason: RpcClientConnectionStatus.NotConnected});
            client.close();
        }

        return result;
    };
}
