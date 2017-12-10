import bind from 'bind-decorator';
import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {RootState} from '../global/state';
import {loginUser} from '../global/state/user-state-actions';

// Include our SCSS (via webpack magic)
import './loading-spinner.scss';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    isLoading: boolean;
    loadingFailed: boolean;
}

class _LoadingSpinnerComponent extends React.PureComponent<Props> {

    public render() {
        if (this.props.isLoading) {
            return <div className="loading-msg">
                <div className="spinner" aria-label="Loading"></div>
            </div>;
        } else if (this.props.loadingFailed) {
            return <div className="loading-msg">
                <h1>An Error Occurred</h1>
                <p>Unable to connect to BORIS.</p>
                <button onClick={this.handleTryAgainButton}>Try again</button>
            </div>;
        } else {
            return <React.Fragment>{this.props.children}</React.Fragment>;
        }
    }

    @bind private handleTryAgainButton() {
        location.reload();
    }
}

export const LoadingSpinnerComponent = connect((state: RootState, ownProps: OwnProps) => ({
    isLoading: state.initState.initCompleted === undefined,
    loadingFailed: state.initState.initCompleted === false,
}))(_LoadingSpinnerComponent);
