import * as React from 'react';
import { connect, DispatchProp } from 'react-redux';

import { RootState } from '../global/state';
import { RpcClientConnectionStatus } from './rpc-client-actions';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    connectionStatus: RpcClientConnectionStatus;
}

/**
 * A widget that displays a UI indicator if the RPC/websocket connection to the
 * server becomes unavailable (e.g. the user goes offline).
 */
export class _RpcConnectionStatusIndicator extends React.PureComponent<Props> {

    public render() {
        let indicator: JSX.Element;
        if (this.props.connectionStatus === RpcClientConnectionStatus.Connected) {
            indicator = null;
        } else if (this.props.connectionStatus == RpcClientConnectionStatus.Offline) {
            indicator = <div className="rpc-status-indicator">
                🔴 Offline. Unable to connect to BORIS.
            </div>;
        } else {
            // Device is not offline, but we are disconnected or trying to connect
            indicator = <div className="rpc-status-indicator">
                ⚠️ Unable to connect to BORIS!
            </div>;
        }
        return <div className="uses-rpc">
            {indicator}
            <div>{this.props.children}</div>
        </div>;
    }
}

export const RpcConnectionStatusIndicator = connect((state: RootState, ownProps: OwnProps) => ({
    connectionStatus: state.rpcClientState.status,
}))(_RpcConnectionStatusIndicator);
