import bind from 'bind-decorator';
import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {RootState} from '../global/state';
import { LoadingSpinnerComponent } from './loading-spinner';
import { LoadingState } from './loading-state';

interface OwnProps {
}
interface Props extends OwnProps {
    state: LoadingState;
}

class _RootLoadingSpinnerComponent extends React.PureComponent<Props> {
    public render() {
        return <LoadingSpinnerComponent state={this.props.state} onTryAgain={this.onTryAgain}>
            {this.props.children}
        </LoadingSpinnerComponent>
    }
    @bind private onTryAgain() { 
        location.reload()
    }
}

export const RootLoadingSpinnerComponent = connect((state: RootState, ownProps: OwnProps) => ({
    state: state.initState.initState,
}))(_RootLoadingSpinnerComponent);
