import * as React from 'react';

// Include our SCSS (via webpack magic)
import './lobby.scss';

interface Props {
    onDone: () => void;
}
interface State {
    showing: boolean;
}

export class BorisInit extends React.PureComponent<Props, State> {

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
            setTimeout(this.props.onDone, 1500)
        },
        4500)
    }

    render() {
        let status = '';
        if (this.state.showing) {
            status = 'showing';
        } else {
            status = 'hidden'
        }
        return (
            <div className={'splash boris ' + status}>
                <div>
                    <div className="boris-container"></div>
                    <h3>Initializing<br />BORIS&hellip;</h3>
                </div>
            </div>
        )
    }
}