import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';
import {bind} from 'bind-decorator';

import { RootState } from './global/state';
import { Mode as RegistrationMode } from './registration/registration-state';
import { LobbyComponent } from './lobby/lobby';
import { Mode as LobbyMode } from './lobby/lobby-state';
import { RegistrationComponent } from './registration/registration';
import { GameComponent } from './game/game';
import { Message } from './global/state/messages-state';
import { Prompt } from './prompt/prompt';
import { AnyAction } from './global/actions';
import { MessagesStateActions } from './global/state/messages-state-actions';
import { MarketComponent } from './market/market';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    isLoggedIn: boolean;
    hasJoinedTeam: boolean;
    isPlaying: boolean;
    showMarket: boolean;
    readyToPlay: boolean;
    modalMessage: Message;
}

class _App extends React.PureComponent<Props> {
    public render() {
        return <>
            {
                this.props.isPlaying ? <GameComponent/> :
                this.props.readyToPlay && this.props.showMarket ? <MarketComponent/> :
                this.props.readyToPlay ? <LobbyComponent/> :
                /* otherwise ? */ <RegistrationComponent/>
            }
            {this.props.modalMessage &&
                <Prompt close={this.handleCloseMessage}
                    heading={this.props.modalMessage.title}
                    show={true}
                >
                    <div dangerouslySetInnerHTML={{ __html: this.props.modalMessage.html }} />
                    <button onClick={this.handleCloseMessage}>OK</button>
                </Prompt>
            }
        </>;
    }

    @bind handleCloseMessage() {
        this.props.dispatch<AnyAction>({type: MessagesStateActions.DISMISS_MESSAGE});
    }
}

export const App = connect((state: RootState, ownProps: OwnProps) => ({
    isLoggedIn: state.userState.isLoggedIn,
    hasJoinedTeam: state.teamState.hasJoinedTeam,
    isPlaying: state.gameState.isActive || state.gameState.isReviewingGame,
    showMarket: state.lobbyState.mode === LobbyMode.Market,
    readyToPlay: state.registrationState.mode === RegistrationMode.ReadyToPlay,
    modalMessage: state.messagesState.currentMessage,
}))(_App);
