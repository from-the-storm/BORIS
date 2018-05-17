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
                    <div className="chat-segment">
                        <p>It's always better on holiday.</p>
                        <p>So much better on holiday.</p>
                        <p>That's why we only work when we need the money.</p>
                    </div>
                    <div className="chat-segment backfeed">
                        <p>How far do we have to stretch the truth to fit the lifestyles borrowed and overdue?</p>
                    </div>
                    <div className="response-segment">
                        <button>Halfway there</button>
                        <button>You said survive alone</button>
                    </div>
                    <div className="chat-segment clarence">
                        <p>Funny how music put times in perspective</p>
                        <p>Add a sountrack to your life and perfect it. Whenever you are feeling blue keep walking and we can get far.</p>
                    </div>
                    <div className="response-segment">
                        <button className="wrong">Where's he get it all from?</button>
                        <button>This hell of a temper</button>
                        <button className="correct">It's so good to see you again</button>
                        <button>It's beautiful when he talks to you even though we can't really tell what he's saying</button>
                    </div>
                    <div className="chat-segment">
                        <p>That's right. <span className="saltines gained">+10</span> saltines for your team. Or sorry, wait. No <span className="saltines lost">-2</span> saltines for your team.</p>
                    </div>
                    <div className="no-segment">
                        <p>Hello these two kids and they've gotta make an ungodly decision. They decide which one gets to leave.</p>
                        <p>And which one gets to make it, forsake it. All that I know is no way to fix it.</p>
                        <p>Quit watching me sleep.</p>
                    </div>
                    <div className="chat-segment">
                        <p>Hello these two kids and they've gotta make an ungodly decision. They decide which one gets to leave.</p>
                        <p>And which one gets to make it, forsake it. All that I know is no way to fix it.</p>
                    </div>
                    <div className="bulletin-segment">
                        <p>Somebody said it's unspeakable. You lift that burden off of me. Somebody said it's unspeakable. You lift that burden off of me. Somebody said it's unspeakable. You lift that burden off of me. Somebody said it's unspeakable. You lift that burden off of me. Somebody said it's unspeakable. You lift that burden off of me. Somebody said it's unspeakable. You lift that burden off of me. </p>
                    </div>
                    <div className="chat-segment">
                        <p>When the first officer arrived...</p>
                    </div>
                    <div className="response-segment">
                        <form>
                            <input className="deselected" required type="text" placeholder="..." aria-label="Response to Question" />
                            <button>Submit</button>
                        </form>
                    </div>
                    <div className="no-segment">
                        <p>Hello these two kids and they've gotta make an ungodly decision. They decide which one gets to leave.</p>
                        <p>And which one gets to make it, forsake it. All that I know is no way to fix it.</p>
                        <p>Quit watching me sleep.</p>
                    </div>
                    <div className="response-segment">
                        <form>
                            <textarea rows={4} cols={30} className="deselected" required placeholder="..." aria-label="Longer response to question"></textarea>
                            <button>Submit</button>
                        </form>
                    </div>
                    <div className="bulletin-segment">
                        <p>Somebody said it's unspeakable. You lift that burden off of me. Somebody said it's unspeakable. You lift that burden off of me. Somebody said it's unspeakable. You lift that burden off of me. Somebody said it's unspeakable. You lift that burden off of me. Somebody said it's unspeakable. You lift that burden off of me. Somebody said it's unspeakable. You lift that burden off of me. </p>
                    </div>
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
