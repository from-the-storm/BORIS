import * as React from 'react';

import { MessageStepUiState } from '../../../common/game';


interface Props extends MessageStepUiState {
}

export class MessageStep extends React.PureComponent<Props> {
    public render() {
        return (
            <div className={"chat-segment" + (this.props.character ? ` ${this.props.character}` : '')}>
                {this.props.messages.map((msg, idx) => <p key={idx} dangerouslySetInnerHTML={{__html: msg}}></p>)}
            </div>
        );
    }
}
