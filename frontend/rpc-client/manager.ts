import { MiddlewareAPI } from "redux";
import Client from 'jsonrpc-websocket-client';
import { RootState } from "../global/state";
import { AnyAction } from "../global/actions";
import { RpcClientConnectionStatus, Actions } from "./rpc-client-actions";
import { handleNotification } from "./notifications";
import { Store } from "react-redux";
import { refreshGameUiState } from "../global/state/game-state-actions";

/**
 * Redux middleware that maintains a persistent websocket connection to BORIS,
 * but only when the user's device is online and the state's 'wantConnection'
 * is true. (So we don't bother with a websocket if the user is not logged in,
 * for example.)
 * @param store The redux store
 */
export function rpcClientMiddleware(store: MiddlewareAPI<RootState>) {

    const client = new Client((location.protocol === 'http:' ? 'ws:' : 'wss:') + `//${location.host}/rpc`);
    let lastPingReceivedAt: Date;

    /**
     * Check the connection status. This function should be called whenever any event is detected
     * that may be relevant to the websocket (such as the online/offline events), as well as on a
     * fixed interval to confirm that the connection is still open and working.
     */
    const checkConnectionStatus = () => {
        // First make sure that we _should_ be connected at this point, and that we're not already trying to connect:
        if (!store.getState().rpcClientState.wantConnection) {
            return; // We are not supposed to be connected right now, so don't even try
        }
        if (client.status === 'open') {
            const secondsSinceLastPing = (Date.now() - +lastPingReceivedAt) / 1000;
            //console.log(`It has been ${secondsSinceLastPing}s since last ping`);
            if (secondsSinceLastPing > 40) {  // The server pings every 30s
                console.error("WebSocket connection silently stopped; terminating.");
                client.close();
                // If we just call client.close(), it will take another ~60s to try to
                // gracefully close and finally time out. So unfortunately we have to
                // make the client think that the connection has closed immediately
                // by calling its close event handler directly.
                client._onClose();
                // Our close event handler will get the close event and reconnect.
            }
            return;
        } else if (client.status === 'connecting') {
            return; // We're already trying to connect - no action necessary
        }
        // Connection is closed.
        if (!navigator.onLine) {
            // This device is definitely offline, so don't bother trying to connect.
            // The 'online' event handler will try this again once the device is back online.
            return;
        }
        // Indicate that we're trying to connect:
        store.dispatch<AnyAction>({type: Actions.WSCS_UNAVAILABLE, reason: RpcClientConnectionStatus.TryingToConnect});
        // Try to reconnect:
        client.open().catch((error: any) => {
            // If the open fails immediately, it won't send a 'closed' event, so we need to handle this now:
            if (store.getState().rpcClientState.status === RpcClientConnectionStatus.TryingToConnect) {
                store.dispatch<AnyAction>({type: Actions.WSCS_UNAVAILABLE, reason: RpcClientConnectionStatus.NotConnected});
            }
            // The 10s interval calls to this function will make us try again in 10 seconds.
        });
    }

    window.addEventListener('online', checkConnectionStatus, false);
    window.addEventListener('offline', () => {
        console.log("This device is offline - cannot communicate with BORIS while offline.");
        store.dispatch<AnyAction>({type: Actions.WSCS_UNAVAILABLE, reason: RpcClientConnectionStatus.Offline});
        client.close();
    }, false);

    client.on('open', () => {
        // We could dispatch WSCS_AVAILABLE to change the state to show the connection is open,
        // but it's better to do that below once we get the 'connection_ready' notification from the server.

        // But we do want to set lastPingReceivedAt to the current time, so that it's never 'null'
        // while a connection is open, and we can tell how long it's been since the server last sent
        // a message.
        lastPingReceivedAt = new Date();
    });
    client.on('closed', () => {
        // Normally the 'close' event will come after we've chosen to close the connection
        // in which case, rpcClientState.status will already reflect the reason.
        if (store.getState().rpcClientState.status === RpcClientConnectionStatus.Connected) {
            console.error('RPC connection unexpectedly closed');
            store.dispatch<AnyAction>({type: Actions.WSCS_UNAVAILABLE, reason: RpcClientConnectionStatus.NotConnected});
        }
        setTimeout(checkConnectionStatus, 150); // Try reconnecting ASAP (will check if we _should_ first, then try.)
    });

    client.on('notification', (notification: any) => {
        lastPingReceivedAt = new Date(); // Any type of notification should keep the connection open
        if (notification.method === 'connection_ready' && store.getState().rpcClientState.wantConnection) {
            store.dispatch<AnyAction>({type: Actions.WSCS_AVAILABLE});
            // In case a game has started/stopped/updated while we were disconnected:
            if (store.getState().teamState.hasJoinedTeam) { // The API call will return an error if we're not even on a team, so only check if we are.
                store.dispatch(refreshGameUiState());
            }
            console.log("CONNECTION READY");
        } else if (notification.method === 'ping') {
            // Do nothing; we've already updated lastPingReceivedAt
        } else {
            console.log('notification received', notification);
            handleNotification(store as Store<RootState>, notification.params);
        }
    });

    setInterval(checkConnectionStatus, 10_000);
    
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
            checkConnectionStatus();
        } else if (!wantsConnection && wantedConnection) {
            console.log("We want the websocket to be DISconnected now");
            store.dispatch<AnyAction>({type: Actions.WSCS_UNAVAILABLE, reason: RpcClientConnectionStatus.NotConnected});
            client.close();
        }

        return result;
    };
}
