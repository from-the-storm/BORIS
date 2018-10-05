import {bind} from 'bind-decorator';
import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import { RootState } from '../global/state';
import { Actions as LobbyActions } from '../lobby/lobby-state-actions';
import { AnyAction } from '../global/actions';
import { RpcConnectionStatusIndicator } from '../rpc-client/rpc-status-indicator';
import { updateSaltinesBalance } from '../global/state/team-state-actions';
import { punchcards } from '../../common/market';

import * as back from '../lobby/images/back.svg';
import * as saltine from '../lobby/images/saltine.svg';

import * as card_img_hint from './images/hint.png';
import * as card_img_home_row from './images/home_row.png';
import * as card_img_paper from './images/paper.png';
import * as card_img_pnp from './images/pnp.png';
import * as card_img_timehoarder from './images/timehoarder.png';

const punchcardImages: {[k: string]: string} = {
    'hint': card_img_hint,
    'home_row': card_img_home_row,
    'paper': card_img_paper,
    'pnp': card_img_pnp,
    'timehoarder': card_img_timehoarder,
};

// Include our SCSS (via webpack magic)
import './market.scss';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    saltinesBalance: number;
    shouldShowPrelude: boolean;
}
interface State {
    showPunchcardDetails: string|null; // Which punchard the user selected to see details of
    showingPreludeConversation: boolean;
    numPreludeMessagesShown: number;
}

class _MarketComponent extends React.PureComponent<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = ({
            showPunchcardDetails: null,
            showingPreludeConversation: props.shouldShowPrelude,
            numPreludeMessagesShown: 0,
        });
        this.props.dispatch(updateSaltinesBalance());
        if (props.shouldShowPrelude) {
            setTimeout(this.showNextPreludeMessage, 100);
        }
    }

    @bind private handleBackButton() {
        if (this.state.showPunchcardDetails !== null) {
            this.setState({showPunchcardDetails: null});
        } else {
            this.props.dispatch<AnyAction>({type: LobbyActions.SHOW_SCENARIOS_LIST});
        }
    }

    @bind private showNextPreludeMessage() {
        this.setState({
            numPreludeMessagesShown: this.state.numPreludeMessagesShown + 1,
        });
        if (this.state.numPreludeMessagesShown < 5) {
            setTimeout(this.showNextPreludeMessage, 1000);
        }
    }

    @bind private handleDonePrelude() {
        this.setState({showingPreludeConversation: false});
    }

    public render() {
        const showCardDetails = this.state.showPunchcardDetails ? punchcards.find(c => c.id == this.state.showPunchcardDetails) : null;
        return <RpcConnectionStatusIndicator>
            <div className={'market' + (this.state.showingPreludeConversation ? '' : ' fade-bg')}>
                <header className="fixed">
                    <button onClick={this.handleBackButton}><img height="22" width="22" src={back} alt="Back" /></button>
                    <div className="saltines-balance">
                        <img src={saltine} alt="Saltines balance: " />
                        <span>{this.props.saltinesBalance}</span>
                    </div>
                </header>
                <div className="content">
                    {
                        this.state.showingPreludeConversation ?
                            <div className="market-prelude">
                                {[
                                    <div key={1} className="chat-segment clarence"><p>Prelude messages</p></div>,
                                    <div key={2} className="chat-segment clarence"><p>go here</p></div>,
                                    <div key={3} className="chat-segment clarence"><p>and here</p></div>,
                                    <div key={4} className="chat-segment clarence"><p>like this</p></div>,
                                    <div key={5} className="response-segment multi-choice"><button onClick={this.handleDonePrelude}>Let's commerce!</button></div>
                                ].slice(0, this.state.numPreludeMessagesShown)}
                            </div>
                        :showCardDetails ?
                            <div>
                                <h3>{showCardDetails.name}</h3>
                                <p>{showCardDetails.description}</p>
                                Punchcard details.
                            </div>
                        :// If not showing the prelude or a specific punchcard, show the list of punchcards:
                            <div className="punchcard-list">
                                {punchcards.map(card => (
                                    <div key={card.id} className="punchcard-option">
                                        <h2>{card.name}</h2>
                                        <img className="card-illustration" src={punchcardImages[card.id]} alt="" />
                                        <div className="cost">
                                            <img src={saltine} alt="Saltines cost: " />
                                            {card.saltinesCost}
                                        </div>
                                        <button onClick={() => { this.showPunchcardDetails(card.id); }}>INFO</button>
                                    </div>
                                ))}
                            </div>
                    }
                </div>
            </div>
        </RpcConnectionStatusIndicator>;
    }

    @bind showPunchcardDetails(cardId: string) {
        this.setState({
            showPunchcardDetails: cardId,
        });
    }
}

export const MarketComponent = connect((state: RootState, ownProps: OwnProps) => ({
    shouldShowPrelude: state.teamState.scenariosComplete <= 1,
    saltinesBalance: state.teamState.saltinesBalance,
}))(_MarketComponent);
