import {bind} from 'bind-decorator';
import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {RootState} from '../global/state';
import { AnyAction } from '../global/actions';
import { RpcConnectionStatusIndicator } from '../rpc-client/rpc-status-indicator';

import * as teams from './images/teams-icon.svg';

// Include our SCSS (via webpack magic)
import './game.scss';
import { Prompt } from '../prompt/prompt';
import { abandonGame } from '../global/state/game-state-actions';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    scenarioName: string;
}
interface State {
    showQuitPrompt: boolean;
}

class _GameComponent extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {showQuitPrompt: false};
    }

    public render() {
        return <RpcConnectionStatusIndicator>
            <div className="game">
                <header>
                    BORIS
                </header>
                <div className="content">
                    You are now playing {this.props.scenarioName}.
                </div>
                <button onClick={this.handleQuitButton}>Quit</button>
            </div>
            <Prompt close={this.handleCancelQuitPrompt}
                heading="Abandon Scenario?"
                show={this.state.showQuitPrompt}
            >
                <p>Warning! Doom!</p>
                <p>All progress will be lost and your teammates will get the unceremonious boot.</p>
                <div className="button-split">
                    <a className="small" onClick={this.handleConfirmQuit}>Abandon Scenario</a>
                    <button onClick={this.handleCancelQuitPrompt}>Resume Scenario</button>
                </div>
            </Prompt>
        </RpcConnectionStatusIndicator>;
    }

    @bind private handleQuitButton() {
        this.setState({showQuitPrompt: true});
    }
    @bind private handleCancelQuitPrompt() {
        this.setState({showQuitPrompt: false});
    }
    @bind private handleConfirmQuit() {
        this.setState({showQuitPrompt: false});
        this.props.dispatch(abandonGame());
    }
}

export const GameComponent = connect((state: RootState, ownProps: OwnProps) => ({
    scenarioName: state.gameState.scenarioName,
}))(_GameComponent);
