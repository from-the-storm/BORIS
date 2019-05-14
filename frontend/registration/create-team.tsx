import bind from 'bind-decorator';
import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {RootState} from '../global/state';
import { TeamStateActions, TeamStateActionsType } from '../global/state/team-state-actions';
import { Actions } from './registration-state-actions';
import { CREATE_TEAM, TeamStatus } from '../../common/api';
import { callApi } from '../api';
import { AnyAction } from '../global/actions';


interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    teamCode: string|null; // Gets set after the team is successfully created
}
interface State {
    teamName: string;
    organizationName: string;
    // State of the submission:
    errorMessage: string,
    waitingForServerResponse: boolean,
}

class _CreateTeamComponent extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            teamName: "",
            organizationName: "",
            errorMessage: "",
            waitingForServerResponse: false,
        };
    }
    public render() {
        if (this.isCreated) {
            return <div>
                <h1>Team Created!</h1>
                <p>Your team, {this.state.teamName}, has been created!</p>
                <h2>Your Team Code</h2>
                <span className="team-code-display">{this.props.teamCode}</span>
                <p>Others will need this code to join your team.</p>
                <button className="right">Continue</button>
            </div>;
        } else {
            return <div>
                <h1>Create Team</h1>
                <form onSubmit={this.handleFormSubmit}>
                    <input name="teamName" type="text" required placeholder="Team name" aria-label="Team name" value={this.state.teamName} onChange={this.handleFormFieldChange} className={this.state.teamName ? 'selected' : 'deselected'} />
                    <input name="organizationName" type="text" placeholder="Organization Name" aria-label="Organization Name" aria-describedby="org-details" value={this.state.organizationName} onChange={this.handleFormFieldChange} className="selected" />
                    <p id="org-details">What organization, company, or group are you associated with (if any)?</p>
                    {this.state.errorMessage ?
                        <div className="team-error">{this.state.errorMessage}</div>
                    :null}
                    <div className="button-split">
                        <a className="small" onClick={this.cancelCreateTeam}>&lt; Back</a>
                        {/* For the Create button, there's no click handler - it will submit the form, after
                            first triggering the browser's built-in form validation.*/}
                        <button disabled={this.state.waitingForServerResponse}>Create My Team</button>
                    </div>
                </form>
            </div>;
        }
    }
    private get isCreated() {
        return this.props.teamCode !== null;
    }

    @bind private handleFormFieldChange(event: React.ChangeEvent<HTMLInputElement>) {
        const name = event.target.name;
        const value = (event.target.type === 'number' && event.target.value) ? parseInt(event.target.value) : event.target.value;
        this.setState({[name]: value} as any);
    }
    @bind private cancelCreateTeam() {
        this.props.dispatch<AnyAction>({type: Actions.SHOW_JOIN_TEAM});
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
        let response: TeamStatus;
        try {
            response = await callApi(CREATE_TEAM, {
                teamName: this.state.teamName,
                organizationName: this.state.organizationName,
            });
        } catch (error) {
            throw new Error(`Unable to register your team: ${error.message}`);
        }
        this.setState({
            waitingForServerResponse: false,
        });
        this.props.dispatch<AnyAction>({
            type: TeamStateActions.JOIN_TEAM,
            teamName: response.teamName,
            teamCode: response.teamCode,
            isTeamAdmin: response.isTeamAdmin,
            otherTeamMembers: response.otherTeamMembers,
        });
    }
}

export const CreateTeamComponent = connect((state: RootState, ownProps: OwnProps) => ({
    teamCode: state.teamState.teamCode,
}))(_CreateTeamComponent);
