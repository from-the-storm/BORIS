import {bind} from 'bind-decorator';
import * as React from 'react';

import { AnyUiState, StepType, MessageStepUiState } from '../../../common/game';


interface Props extends MessageStepUiState {
}
interface State {
}

export class MessageStep extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {};
    }

    public render() {
        return (
            <div className={"chat-segment" + (this.props.character ? ` ${this.props.character}` : '')}>
                {this.props.messages.map((msg, idx) => <p key={idx}>{msg}</p>)}
            </div>
        );
    }
}
