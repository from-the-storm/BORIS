import * as React from 'react';
import * as movember from './images/funded-by-movember.png';

// Include our SCSS (via webpack magic)
import './lobby.scss';

interface Props {
    onDone: () => void;
}
interface State {
    showing: boolean;
}

export class Splash extends React.PureComponent<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = ({
            showing: true
        })
    }

    componentDidMount() {
        setTimeout(() => {
            this.setState({
                showing: false,
            });
            setTimeout(this.props.onDone, 100)
        },
        500)
    }

    render() {
        let status = '';
        if (this.state.showing) {
            status = 'showing';
        } else {
            status = 'hidden'
        }
        return (
            <div className={'splash ' + status}>
                <div>
                    <img src={movember} alt="Movember Foundation Logo" />
                    <h3>Apocalypse Made Easy!</h3>
                    <p>is a Social Innovators Challenge project funded by the Movember Foundation.</p>
                </div>
            </div>
        )
    }
}