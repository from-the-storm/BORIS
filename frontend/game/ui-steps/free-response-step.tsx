import {bind} from 'bind-decorator';
import * as React from 'react';
import { connect, DispatchProp } from 'react-redux';

import { FreeResponseStepUiState } from '../../../common/game';
import { callApi } from '../../api';
import { STEP_RESPONSE } from '../../../common/api';
import { AnyAction } from '../../global/actions';
import { MessagesStateActions } from '../../global/state/messages-state-actions';


interface Props extends FreeResponseStepUiState, DispatchProp<AnyAction> {
}
interface State {
    value: string;
    answerIsbeingSubmitted: boolean;
}

export class _FreeResponseStep extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            value: '',
            answerIsbeingSubmitted: false,
        };
    }

    public render() {
        if (this.props.complete) {
            // The user already submitted their answer here, so just display the text they entered.
            // TODO: change this to not be a <button> ? Should be a DIV or P
            return (
                <div className="response-segment">
                    <button disabled={true}>{this.props.value}</button>
                </div>
            );
        } else {
            // Show a form for the user to enter their answer:
            return (
                <div className="response-segment">
                    <form onSubmit={() => false}>
                        <input value={this.state.value} onChange={this.valueChanged} className="deselected" required type="text" placeholder="..." aria-label="Response to Question" />
                        <button disabled={this.state.answerIsbeingSubmitted} onClick={this.handleSubmit}>Submit</button>
                    </form>
                </div>
            );
        }
    }

    @bind valueChanged(event: React.ChangeEvent<HTMLInputElement>) {
        this.setState({value: event.target.value});
    }

    @bind async handleSubmit(event: React.MouseEvent<HTMLButtonElement>) {
        event.preventDefault();
        this.setState({answerIsbeingSubmitted: true});
        try {
            await callApi(STEP_RESPONSE, {
                stepId: this.props.stepId,
                value: this.state.value,
            });
        } catch (err) {
            this.props.dispatch<AnyAction>({
                type: MessagesStateActions.SHOW_ERROR,
                title: "Unable to submti answer",
                errorHtml: err.message,
            });
        }
        this.setState({answerIsbeingSubmitted: false});
    }
}

export const FreeResponseStep = connect()(_FreeResponseStep);
