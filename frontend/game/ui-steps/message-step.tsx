import * as React from 'react';

import { MessageStepUiState } from '../../../common/game';


interface Props extends MessageStepUiState {
}

export class MessageStep extends React.PureComponent<Props> {
    public render() {
        let classes = 'chat-segment';
        if (this.props.character === 'nameless') {
            classes = 'no-segment';
        } else if (this.props.character) {
            classes += ` ${this.props.character}`;
        }
        return (
            <div className={classes}>
                {this.props.messages.map((msg, idx) => <p key={idx} dangerouslySetInnerHTML={{__html: msg}}></p>)}
            </div>
        );
    }
}
