import  { Dispatch } from 'redux';

export const enum RpcClientConnectionStatus {
    Offline,
    NotConnected,
    TryingToConnect,
    Connected,
}

//// Websocket Connection State Actions

export enum Actions {
    // WSCS_ prefix means WebSocket Connection State
    // The websocket connection is unavailable or has become unavailable (e.g. the user's device or the server is offline)
    WSCS_UNAVAILABLE = 'WSCS_UNAVAILABLE',
    // The websocket connection has become available
    WSCS_AVAILABLE = 'WSCS_AVAILABLE',
}

interface WebSocketConnectionUnavailableAction {
    type: Actions.WSCS_UNAVAILABLE;
    reason: RpcClientConnectionStatus.Offline|RpcClientConnectionStatus.NotConnected|RpcClientConnectionStatus.TryingToConnect;
}
interface WebSocketConnectionAvailableAction { type: Actions.WSCS_AVAILABLE; }

export type RpcClientStateActionType = (
    WebSocketConnectionUnavailableAction |
    WebSocketConnectionAvailableAction
);
