import * as React from 'react';

import { ProgressStepUiState } from '../../../common/game';


interface Props extends ProgressStepUiState {
}

export class ProgressStep extends React.PureComponent<Props> {
    public render() {
        return (
            <div className="chat-segment">
                <h3 className="progress-heading">Progress</h3>
                <progress value={this.props.percentage} max="100"></progress>
                <p dangerouslySetInnerHTML={{__html: this.props.messageHTML}}></p>
            </div>
        );
    }
}
