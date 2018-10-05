import {bind} from 'bind-decorator';
import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import { RootState } from '../global/state';
import { Actions as LobbyActions } from '../lobby/lobby-state-actions';
import { AnyAction } from '../global/actions';
import { RpcConnectionStatusIndicator } from '../rpc-client/rpc-status-indicator';
import { updateSaltinesBalance } from '../global/state/team-state-actions';

import * as back from '../lobby/images/back.svg';
import * as saltine from '../lobby/images/saltine.svg';

// Include our SCSS (via webpack magic)
import './market.scss';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    saltinesBalance: number;
}
interface State {
    showPunchcardDetails: number|null; // Which punchard the user selected to see details of
    showPreludeConversation: boolean;
}

class _MarketComponent extends React.PureComponent<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = ({
            showPunchcardDetails: null,
            showPreludeConversation: true,
        });
        this.props.dispatch(updateSaltinesBalance());
    }

    @bind private handleBackButton() {
        if (this.state.showPunchcardDetails !== null) {
            this.setState({showPunchcardDetails: null});
        } else {
            this.props.dispatch<AnyAction>({type: LobbyActions.SHOW_SCENARIOS_LIST});
        }
    }

    public render() {
        return <RpcConnectionStatusIndicator>
            <div className="market">
                <header className="fixed">
                    <button onClick={this.handleBackButton}><img height="22" width="22" src={back} alt="Back" /></button>
                    <div className="saltines-balance">
                        <img src={saltine} alt="Saltines balance: " />
                        <span>{this.props.saltinesBalance}</span>
                    </div>
                </header>
                <div className="content">
                    Market!
                </div>
            </div>
        </RpcConnectionStatusIndicator>;
    }
}

export const MarketComponent = connect((state: RootState, ownProps: OwnProps) => ({
    saltinesBalance: state.teamState.saltinesBalance,
}))(_MarketComponent);
