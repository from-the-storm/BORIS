import * as React from 'react';
import * as open from './images/market/open.png';
import * as actualized from './images/market/actualized.png';
import * as boarded from './images/market/closed.png';
import * as taped from './images/market/move.png';

interface Props {
    completedScenarios: number;
    isBurdened: boolean;
}

export class MarketButton extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
    }
    render() {
        const image = this.setImage();
        const id = image.substring(image.lastIndexOf("/") + 1, image.lastIndexOf("-"));
        return (
            <div id="market-button-container">
                <button className="market" id={id}>
                    <img src={image} alt="Market Button" />
                </button>
            </div>
        )
    }
    private setImage() {
        if (this.props.isBurdened) {
            if (this.props.completedScenarios < 3) {
                return open;
            }
            return actualized;
        } 
        else if (this.props.completedScenarios >= 3) {
            return boarded;
        } 
        return taped;
    }
}
