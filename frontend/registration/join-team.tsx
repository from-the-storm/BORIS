import { bind } from 'bind-decorator';
import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import { callApi } from '../api';
import { RootState } from '../global/state';
import { Actions } from './registration-state-actions';
import { TeamStateActions } from '../global/state/team-state-actions';

import { CreateOrJoinTeamResponse, JOIN_TEAM } from '../../common/api';
import { AnyAction } from '../global/actions';


interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    firstName: string;
    userId: number;
    userEmail: string;
}
interface State {
    showEnterCode: boolean;
    waitingForServerResponse: boolean;
    code: string;
    errorMessage: string;
}

class _JoinTeamComponent extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            showEnterCode: false,
            waitingForServerResponse: false,
            code: '',
            errorMessage: '',
        };
    }
    public render() {
        const firstNameEncoded = encodeURIComponent(this.props.firstName);
        const emailEncoded = encodeURIComponent(this.props.userEmail);
        if (this.state.showEnterCode) {
            return <div>
                <h1>Join Team</h1>
                <p>Enter the team code:</p>
                <form onSubmit={this.handleFormSubmit}>
                    <input type="text" required maxLength={10} placeholder="e.g. ABCDE" onChange={this.handleCodeChanged} value={this.state.code} className={this.state.code ? 'selected' : 'deselected'} />
                    {this.state.errorMessage ?
                        <div className="team-error">{this.state.errorMessage}</div>
                    :null}
                    <div className="button-split">
                        <a className="small" onClick={this.handleBackFromJoinTeam}>&lt; Back</a>
                        <button disabled={this.state.waitingForServerResponse}>Join Team</button>
                    </div>
                </form>
            </div>;
        } else {
            return <div>
                <h1>Join/Create Team</h1>
                <div className="button-split full">
                    <button onClick={this.handleJoinTeam}>Join a Team</button>
                    <button onClick={this.handleCreateTeam}>Create a Team</button>
                </div>
                <p><code>Your Propel Survey Test Link is <a target="_blank" rel="noopener noreferrer" href={`http://dev.propelsurveysolutions.ca/registration/en/activity/197/1605/?email=${emailEncoded}&foreignid=${this.props.userId}&firstname=${firstNameEncoded}&consent_field_1=1&consent_field_2=0`}>here</a>.</code></p>
                <p><code>Your UBC Survey Test Link is <a href={'https://ubc.ca1.qualtrics.com/jfe/form/SV_4OuvXI07vLS4xz7?userID=' + this.props.userId }>here</a>.</code></p>
            </div>;
        }
    }

    @bind private handleJoinTeam() {
        this.setState({ showEnterCode: true });
    }
    @bind private handleBackFromJoinTeam() {
        this.setState({ showEnterCode: false });
    }
    @bind private handleCodeChanged(event: React.ChangeEvent<HTMLInputElement>) {
        this.setState({ code: event.target.value });
    }

    @bind private handleCreateTeam() {
        this.props.dispatch<AnyAction>({type: Actions.SHOW_CREATE_TEAM});
    }

    @bind private handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        this.setState({waitingForServerResponse: true});
        this.submitFormData().catch(err => {
            this.setState({
                waitingForServerResponse: false,
                errorMessage: err.message,
            });
        });
        return false;
    }
    private async submitFormData() {
        let data: CreateOrJoinTeamResponse;
        try {
            data = await callApi(JOIN_TEAM, {code: this.state.code});
        } catch (error) {
            throw new Error(`Unable to join team: ${error.message}`);
        }
        this.setState({ waitingForServerResponse: false });
        this.props.dispatch<AnyAction>({
            type: TeamStateActions.JOIN_TEAM,
            teamName: data.teamName,
            teamCode: data.teamCode,
            isTeamAdmin: data.isTeamAdmin,
            otherTeamMembers: [],
        });
    }
}

export const JoinTeamComponent = connect((state: RootState, ownProps: OwnProps) => ({
    firstName: state.userState.firstName,
    userId: state.userState.id,
    userEmail: state.userState.email,
}))(_JoinTeamComponent);
