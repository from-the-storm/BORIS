import {bind} from 'bind-decorator';
import * as React from 'react';

import { MultipleChoiceStepUiState } from '../../../common/game';
import { callApi } from '../../api';
import { STEP_RESPONSE } from '../../../common/api';
import { connect, DispatchProp } from 'react-redux';
import { AnyAction } from '../../global/actions';
import { MessagesStateActions } from '../../global/state/messages-state-actions';


interface Props extends MultipleChoiceStepUiState, DispatchProp<AnyAction> {
}
interface State {
    answerIsbeingSubmitted: boolean; // Set to true temporarily while we're submitting an answer.
}

class _MultipleChoiceStep extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            answerIsbeingSubmitted: false,
        };
    }

    public render() {
        if (this.props.choiceMade) {
            return (
                <div className="response-segment multi-choice">
                    {this.props.choices.map(choice =>
                        <button key={choice.id} disabled={true} className={
                            choice.correct === false ? 'wrong' :
                            choice.correct === true || (choice.selected && choice.correct === null) ? 'correct':
                            ''
                        }>{choice.choiceText}</button>
                    )}
                </div>
            );
        } else {
            return (
                <div className="response-segment multi-choice">
                    {this.props.choices.map(choice =>
                        <button key={choice.id} onClick={() => this.handleChoice(choice.id)} disabled={this.state.answerIsbeingSubmitted}>{choice.choiceText}</button>
                    )}
                </div>
            );
        }
    }

    @bind async handleChoice(choiceId: string) {
        this.setState({answerIsbeingSubmitted: true});
        try {
            await callApi(STEP_RESPONSE, {
                stepId: this.props.stepId,
                choiceId,
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

export const MultipleChoiceStep = connect()(_MultipleChoiceStep);
