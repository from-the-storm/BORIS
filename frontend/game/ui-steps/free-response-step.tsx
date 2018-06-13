import {bind} from 'bind-decorator';
import * as React from 'react';

import { AnyUiState, StepType, FreeResponseStepUiState } from '../../../common/game';


interface Props extends FreeResponseStepUiState {
}
interface State {
}

export class FreeResponseStep extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {};
    }

    public render() {
        if (this.props.complete) {
            // The user already submitted their answer here, so just display the text they entered.
            // TODO: change this to not be a <button> ? Should be a DIV or P
            return (
                <div className="response-segment">
                    <button>{this.props.value}</button>
                </div>
            );
        } else {
            // Show a form for the user to enter their answer:
            return (
                <div className="response-segment">
                    <form>
                        <input className="deselected" required type="text" placeholder="..." aria-label="Response to Question" />
                        <button>Submit</button>
                    </form>
                </div>
            );
        }
    }
}
