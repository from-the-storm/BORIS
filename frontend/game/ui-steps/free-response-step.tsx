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
        return (
            <div className="response-segment free-response">
                {this.props.invalidGuesses.map((guessString, idx) => <React.Fragment key={idx}>
                    <div className="past-entry wrong">{guessString}</div>
                    <div className="past-entry">Hmm. Try something else!</div>
                </React.Fragment>)}
                {
                    this.props.complete ?
                        // The user already submitted their answer here, so just display the text they entered.
                        <div className="past-entry">{this.props.value}</div>
                    :
                        // Show a form for the user to enter their answer:
                        <form onSubmit={() => false}>
                            {
                                this.props.multiline ?
                                    <textarea value={this.state.value} onChange={this.valueChanged} className="deselected" required rows={4} cols={30} placeholder="Type here" aria-label="Response to Question" />
                                :
                                    <input value={this.state.value} onChange={this.valueChanged} className="deselected" required type="text" placeholder="Type here" aria-label="Response to Question" />
                            }
                            <button disabled={this.state.answerIsbeingSubmitted} onClick={this.handleSubmit}>Submit</button>
                        </form>
                }
            </div>
        );
    }

    @bind valueChanged(event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) {
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
                title: "Unable to submit answer",
                errorHtml: err.message,
            });
        }
        this.setState({answerIsbeingSubmitted: false});
    }
}

export const FreeResponseStep = connect()(_FreeResponseStep);
