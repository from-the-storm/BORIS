import {bind} from 'bind-decorator';
import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';
import { List } from 'immutable';
import { Howl } from 'howler';

import { AnyUiState, StepType } from '../../common/game';
import { RootState } from '../global/state';
import { RpcConnectionStatusIndicator } from '../rpc-client/rpc-status-indicator';
import { Prompt } from '../prompt/prompt';
import { abandonGame, doneReviewingGame } from '../global/state/game-state-actions';
import { SplashBorisInit } from './splash-boris-init';

import { MessageStep } from './ui-steps/message-step';
import { FreeResponseStep } from './ui-steps/free-response-step';
import { MultipleChoiceStep } from './ui-steps/choice-step';
import { BulletinStep } from './ui-steps/bulletin-step';
import { FinishLineStep } from './ui-steps/finish-line-step';

import * as back from './images/back.svg';
import * as messageSoundUrl from './sounds/bulletin.mp3';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    scenarioName: string;
    uiState: List<AnyUiState>;
    gameIsFinished: boolean;
}
interface State {
    showHelpPrompt: boolean;
    showQuitPrompt: boolean;
    hasSeenSplash: boolean;
}

class _GameComponent extends React.PureComponent<Props, State> {
    private contentElement: HTMLDivElement;
    private messageSound: Howl;
    constructor(props: Props) {
        super(props);
        this.state = {showHelpPrompt: false, showQuitPrompt: false, hasSeenSplash: false};
        this.messageSound = new Howl({
            src: [messageSoundUrl],
        });
    }
    public render() {
        const uiElements: JSX.Element[] = [];
        this.props.uiState.forEach(step => {
            uiElements.push(
                step === null ? null :
                step.type === StepType.MessageStep ? <MessageStep key={step.stepId} {...step} /> :
                step.type === StepType.FreeResponse ? <FreeResponseStep key={step.stepId} {...step} /> :
                step.type === StepType.MultipleChoice ? <MultipleChoiceStep key={step.stepId} {...step} /> :
                step.type === StepType.BulletinStep ? <BulletinStep key={step.stepId} {...step} /> :
                step.type === StepType.FinishLineStep ? <FinishLineStep key={step.stepId} {...step} /> :
                <div className="chat-segment"><strong>Unsupported step type</strong></div>
            );
        });
        return <RpcConnectionStatusIndicator>
            {!this.state.hasSeenSplash && <SplashBorisInit onDone={this.onSplashDone} />}
            <div className="game">
                <header className="fixed">
                    <button onClick={this.handleQuitButton}><img height="22" width="22" src={back} alt="Back" /></button>
                    <h1>{this.props.gameIsFinished ? '(Complete)' : (this.props.scenarioName.replace(/[aeiouy]/ig,''))}</h1>
                    <button className="help" onClick={this.handleHelpButton}>?</button>
                </header>
                <div className="content" ref={el => this.contentElement = el}>
                    {uiElements}
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
                <p><strong>Connection problems?</strong> Make sure your internet's good and/or refresh your browser. You should be brought back to where you were.</p>
                <p><strong>If you're lost,</strong> retrace your steps. If you <strong>can't figure something out,</strong> answer anything and move on.</p>
                <p>If a challenge is <strong>impossible,</strong> please <a href="mailto:info@apocalypsemadeeasy.com">email us</a> about it. We'll find a way to thank you.</p>
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
        if (this.props.gameIsFinished) {
            this.props.dispatch(doneReviewingGame());
        } else {
            this.setState({showQuitPrompt: true});
        }
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

    componentDidUpdate(prevProps: Props, prevState: State, snapshot?: any) {
        // We want to scroll to the bottom when receiving any new message etc.
        // We could just always scroll to the bottom on any update, but on
        // mobile safari, because of the bottom bar, if there are only a
        // few messages on the screen it still lets us scroll slightly, and
        // then the first few messages get cut off. So we don't scroll unless
        // the content element is at least as big as the screen.
        if (this.contentElement.offsetHeight >= window.innerHeight * 0.9) {
            // Scroll as far down as possible.
            // This will use smooth scrolling on browsers that support it.
            window.scrollTo({top: 1e5, behavior: 'smooth'});
        }
        // Play a sound if there's a new UI element, unless the splash screen is still visible:
        if (this.props.uiState.size > prevProps.uiState.size && prevProps.uiState.size > 0 && this.state.hasSeenSplash) {
            this.messageSound.play();
        }
    }
}

export const GameComponent = connect((state: RootState, ownProps: OwnProps) => ({
    scenarioName: state.gameState.scenarioName,
    uiState: state.gameState.uiState,
    gameIsFinished: state.gameState.isReviewingGame,
}))(_GameComponent);
