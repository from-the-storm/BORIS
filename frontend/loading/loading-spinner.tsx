import bind from 'bind-decorator';
import * as React from 'react';
import { LoadingState } from './loading-state';

interface OwnProps {
    state: LoadingState;
    onTryAgain: () => void;
}

export class LoadingSpinnerComponent extends React.PureComponent<OwnProps> {

    public render() {
        if (this.props.state === LoadingState.READY) {
            return <React.Fragment>{this.props.children}</React.Fragment>;
        } else if (this.props.state === LoadingState.LOADING) {
            return <div className="loading-msg">
                <div className="spinner" aria-label="Loading"></div>
            </div>;
        } else if (this.props.state === LoadingState.FAILED) {
            return <div className="loading-msg">
                <h1>An Error Occurred</h1>
                <p>Unable to connect to BORIS.</p>
                <button onClick={this.handleTryAgainButton}>Try again</button>
            </div>;
        } else {
            return <div className="loading-msg">
                <button onClick={this.handleTryAgainButton}>Load</button>
            </div>
        }
    }

    @bind private handleTryAgainButton() {
        this.props.onTryAgain();
    }
}
