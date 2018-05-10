import {bind} from 'bind-decorator';
import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {RootState} from '../global/state';
import { AnyAction } from '../global/actions';
import { RpcConnectionStatusIndicator } from '../rpc-client/rpc-status-indicator';
import { Prompt } from '../prompt/prompt';
import { abandonGame } from '../global/state/game-state-actions';
import { SplashBorisInit } from './splash-boris-init';

import * as teams from './images/teams-icon.svg';

// Include our SCSS (via webpack magic)
import './game.scss';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    scenarioName: string;
}
interface State {
    showHelpPrompt: boolean;
    showQuitPrompt: boolean;
    hasSeenSplash: boolean;
}

class _GameComponent extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {showHelpPrompt: false, showQuitPrompt: false, hasSeenSplash: false};
    }

    public render() {
        return <RpcConnectionStatusIndicator>
            {!this.state.hasSeenSplash && <SplashBorisInit onDone={this.onSplashDone} />}
            <div className="game">
                <header className="fixed">
                    <button onClick={this.handleQuitButton}>◀</button>
                    <h1>{this.props.scenarioName.replace(/[aeiouy]/ig,'')}</h1>
                    <button className="help" onClick={this.handleHelpButton}>?</button>
                </header>
                <div className="content">
                    <p>Game content</p>
                </div>
            </div>
            <Prompt close={this.handleCancelQuitPrompt}
                heading="Abandon Scenario?"
                show={this.state.showQuitPrompt}
                fullscreen
            >
                <p>Warning! Doom!</p>
                <p>All progress will be lost and your teammates will get the unceremonious boot.</p>
                <div className="button-split">
                    <a className="small" onClick={this.handleConfirmQuit}>Abandon</a>
                    <button onClick={this.handleCancelQuitPrompt}>Resume</button>
                </div>
            </Prompt>
            <Prompt close={this.handleCancelHelpPrompt}
                heading="Help"
                show={this.state.showHelpPrompt}
            >
                <p>Here is some help stuff.</p>
            </Prompt>
        </RpcConnectionStatusIndicator>;
    }

    @bind private handleHelpButton() {
        this.setState({showHelpPrompt: true});
    }
    @bind private handleCancelHelpPrompt() {
        this.setState({showHelpPrompt: false});
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
    @bind private onSplashDone() {
        this.setState({hasSeenSplash: true});
    }
}

export const GameComponent = connect((state: RootState, ownProps: OwnProps) => ({
    scenarioName: state.gameState.scenarioName,
}))(_GameComponent);
