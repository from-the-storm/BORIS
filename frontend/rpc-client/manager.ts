import { MiddlewareAPI, Middleware } from "redux";
import { RootState } from "../global/state";
import { AnyAction } from "../global/actions";
import { UserStateActions } from "../global/state/user-state-actions";
import { RpcClientConnectionStatus } from "./rpc-client-actions";

export function updateRpcClient() {
    //

}





export const rpcClientMiddleware = (store: MiddlewareAPI<RootState>) => (next: any) => (action: AnyAction) => {
    console.log('Action: ' + action.type);

    const wantedConnection = store.getState().rpcClientState.wantConnection;
    const result = next(action);
    const wantsConnection = store.getState().rpcClientState.wantConnection;

    if (wantsConnection !== wantedConnection) {
        if (wantsConnection) {
            console.log("We want the websocket to be connected now");
        } else {
            console.log("We want the websocket to be DISconnected now");
        }
    }

    return result;
};
