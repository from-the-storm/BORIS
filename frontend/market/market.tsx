import {bind} from 'bind-decorator';
import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import { RootState } from '../global/state';
import { Actions as LobbyActions } from '../lobby/lobby-state-actions';
import { AnyAction } from '../global/actions';
import { RpcConnectionStatusIndicator } from '../rpc-client/rpc-status-indicator';
import { updateSaltinesBalance, updateMarketVars } from '../global/state/team-state-actions';
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
import { callApi } from '../api';
import { BUY_PUNCHCARD } from '../../common/api';
import { MessagesStateActions } from '../global/state/messages-state-actions';

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
        if (this.state.numPreludeMessagesShown < 4) {
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
                                    <div key={1} className="chat-segment clarence"><p>Welcome to the Nameless Market. I’m CLARENCE. Hope you had no trouble finding us.</p></div>,
                                    <div key={2} className="chat-segment clarence"><p>We exchange saltines for bootleg punchcards that’ll hack into BORIS and give your team bonuses. Cards are automatically applied during the next scenario you play.</p><p>If enough teams do this, we believe the BORIS core will get so gunked up that we can finally crack its archive and expose the truth.</p></div>,
                                    <div key={3} className="chat-segment clarence"><p>Okay, choose a punchcard. Then we'll unlock the other scenarios and you can do as you wish. We promise.</p></div>,
                                    <div key={4} className="response-segment multi-choice"><button onClick={this.handleDonePrelude}>Fine, I'll choose one.</button></div>
                                ].slice(0, this.state.numPreludeMessagesShown)}
                            </div>
                        :showCardDetails ?
                            <div className="punchcard-details">
                                <h1>{showCardDetails.name}</h1>
                                <div>
                                    <img className="card-illustration" src={punchcardImages[showCardDetails.id]} alt="" />
                                    <div className="cost">
                                        <img src={saltine} alt="Saltines cost: " />
                                        {showCardDetails.saltinesCost}
                                    </div>
                                    <p>{showCardDetails.description}</p>
                                    <button onClick={() => { this.buyPunchcard(showCardDetails.id); }}>BUY IT!</button>
                                </div>
                            </div>
                        :// If not showing the prelude or a specific punchcard, show the list of punchcards:
                            <div className="punchcard-list">
                                {punchcards.map(card => (
                                    <div key={card.id} className="punchcard-option">
                                        <div className="punchcard-info">
                                            <h2>{card.name}</h2>
                                            <div className="cost">
                                                <img src={saltine} alt="Saltines cost: " />
                                                {card.saltinesCost}
                                            </div>
                                            <br/><br/>
                                            <button className="hollow" onClick={() => { this.showPunchcardDetails(card.id); }}>INFO?</button>
                                            <button onClick={() => { this.buyPunchcard(card.id); }}>BUY!</button>
                                        </div>
                                        <img className="card-illustration" src={punchcardImages[card.id]} alt="" />
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

    @bind async buyPunchcard(cardId: string) {
        try {
            await callApi(BUY_PUNCHCARD, {punchcardId: cardId});
        } catch (err) {
            this.props.dispatch<AnyAction>({
                type: MessagesStateActions.SHOW_ERROR,
                title: "Cannot Buy Punchcard",
                errorHtml: err.message,
            });
            return;
        }
        this.props.dispatch(updateMarketVars());
        this.props.dispatch<AnyAction>({type: LobbyActions.SHOW_SCENARIOS_LIST});
        this.props.dispatch<AnyAction>({
            type: MessagesStateActions.SHOW_INFO,
            title: "Punchcard Activated",
            infoHtml: "Your punchcard has been purchased and will be active during the next scenario.",
        });
    }
}

export const MarketComponent = connect((state: RootState, ownProps: OwnProps) => ({
    shouldShowPrelude: state.teamState.scenariosComplete <= 1,
    saltinesBalance: state.teamState.saltinesBalance,
}))(_MarketComponent);
