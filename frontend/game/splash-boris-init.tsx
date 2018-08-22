import * as React from 'react';

import { sleep } from '../utils';
import * as movember from './images/funded-by-movember.png';

interface Props {
    onDone: () => void;
}
interface State {
    showing: boolean;
}

export class SplashBorisInit extends React.PureComponent<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = { showing: true };
    }

    componentDidMount() {
        this.hideAfterDelay();
    }

    async hideAfterDelay() {
        await sleep(9600); // 9600 in production
        this.setState({ showing: false });
        await sleep(1500);
        this.props.onDone();
    }

    render() {
        const status = this.state.showing ? 'showing' : 'hidden';
        return (
            <div className={'splash ' + status}>
                <div className="sponsor">
                    <div>
                        <img src={movember} alt="Movember Foundation Logo" />
                        <h3>Apocalypse Made Easy!</h3>
                        <p>is a Social Innovators Challenge project funded by the Movember Foundation.</p>
                    </div>
                </div>
                <div className="boris">
                    <div className="boris-container"></div>
                    <h3>Initializing<br />BORIS&hellip;</h3>
                </div>
            </div>
        );
    }
}
