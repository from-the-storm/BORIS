import * as React from 'react';
import { bind } from 'bind-decorator';

import { MarketStatus } from '../../common/api';

import * as openImg from './images/market/open.png';
import * as tapedImg from './images/market/move.png';

interface MarketImage { url: string; id: string; }
const open: MarketImage = { url: openImg, id: 'open' };
const taped: MarketImage = { url: tapedImg, id: 'move' };

interface Props {
    status: MarketStatus;
    onClick: () => void;
}

export class MarketButton extends React.PureComponent<Props> {
    render() {
        const image = this.image;
        return (
            <div id="market-button-container">
                <button className="market-button" id={image.id} onClick={this.handleMarketClicked}>
                    <img src={image.url} alt="Market Button" />
                </button>
            </div>
        )
    }
    @bind private handleMarketClicked() {
        this.props.onClick();
    }
    private get image(): MarketImage {
        switch (this.props.status) {
            case MarketStatus.AlreadyBought: return taped;
            case MarketStatus.Open: return open;
            case MarketStatus.Taped: return taped;
            default: return {url: "", id: ""};
        }
    }
}
