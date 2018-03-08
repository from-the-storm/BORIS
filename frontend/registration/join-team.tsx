import { bind } from 'bind-decorator';
import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import { postToApi } from '../api';
import { RootState } from '../global/state';
import { Actions } from './registration-state-actions';
import { TeamStateActions } from '../global/state/team-state-actions';

import { CreateOrJoinTeamResponse, JOIN_TEAM } from '../../backend/routes/api-interfaces';


interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
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
        if (this.state.showEnterCode) {
            return <div>
                <h1>Join Team</h1>
                <p>Enter the team code:</p>
                <form onSubmit={this.handleFormSubmit}>
                    <input type="text" required maxLength={10} placeholder="e.g. A1B2C3" onChange={this.handleCodeChanged} value={this.state.code} className={this.state.code ? 'selected' : 'deselected'} />
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
                <h1>Join Team</h1>
                <div className="button-split full">
                    <button onClick={this.handleJoinTeam}>Join a Team</button>
                    <button onClick={this.handleCreateTeam}>Create a Team</button>
                </div>
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
        this.props.dispatch({type: Actions.SHOW_CREATE_TEAM});
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
            data = await postToApi(JOIN_TEAM, {code: this.state.code});
        } catch (error) {
            throw new Error(`Unable to join team: ${error.message}`);
        }
        this.setState({ waitingForServerResponse: false });
        this.props.dispatch({
            type: TeamStateActions.JOIN_TEAM,
            teamName: data.teamName,
            teamCode: data.teamCode,
            isTeamAdmin: data.isTeamAdmin,
            otherTeamMembers: [],
        });
    }
}

export const JoinTeamComponent = connect((state: RootState, ownProps: OwnProps) => ({
}))(_JoinTeamComponent);
