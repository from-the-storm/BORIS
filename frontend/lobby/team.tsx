import bind from 'bind-decorator';
import * as React from 'react';
import { connect, DispatchProp } from 'react-redux';
import { List } from 'immutable';

import { RootState } from '../global/state';
import { OtherTeamMember } from '../../common/models';
import { RpcClientConnectionStatus } from '../rpc-client/rpc-client-actions';
import { leaveTeam } from '../global/state/team-state-actions';

import { Prompt } from '../prompt/prompt';

import * as saltine from './images/saltine.svg';
import { updateMarketVars } from '../global/state/team-state-actions';
import { KICK_OFF_TEAM, LeaderboardEntry } from '../../common/api';
import { updateLeaderboards } from '../global/state/leaders-state-actions';
import { callApi } from '../api';

interface TeamRowProps {
    details: OtherTeamMember,
    isMe: boolean,
    editable: boolean
}

interface TeamRowState {
    showAdminPrompt: boolean,
    showRemovePrompt: boolean
}

/** A row in the list of team members. */
class TeamMemberRow extends React.PureComponent<TeamRowProps, TeamRowState> {
    constructor(props: TeamRowProps) {
        super(props);
        this.state = {
            showAdminPrompt: false,
            showRemovePrompt: false,
        }
    }
    public render() {
        return (
            <li>
                {this.props.details.name} {this.props.isMe && "(That's you!)"}
                {this.props.details.online && <span className="online-indicator"><span className="visually-hidden">online</span></span>}
                {this.props.details.isAdmin && <span className="admin-indicator badge">admin</span>}
                {this.props.editable &&
                    <span>
                        <button aria-label="Remove team member" onClick={this.handleRemove}>X</button>
                        {/* <button onClick={this.handleMakeAdmin}>Make Admin</button> */}
                    </span>
                }
                {this.state.showRemovePrompt &&
                    <Prompt
                        close={this.handleClosePrompt}
                        heading="Remove team member?"
                        show={this.state.showRemovePrompt}
                    >
                        <p>Are you sure you want to remove {this.props.details.name} from your team?</p>
                        <button onClick={this.handleRemoveConfirmed}>Yes</button>
                    </Prompt>
                }
                {this.state.showAdminPrompt &&
                    <Prompt
                        close={this.handleClosePrompt}
                        heading="Assign a new admin?"
                        show={this.state.showAdminPrompt}
                    >
                        <p>Do you want to make {this.props.details.name} a team admin? (You can have as many admins as you'd like.)</p>
                        <button>Yes</button>
                    </Prompt>
                }
            </li>
        )
    }

    @bind private handleMakeAdmin() {
        this.setState({
            showAdminPrompt: true,
        })
    }

    @bind private handleRemove() {
        this.setState({
            showRemovePrompt: true,
        })
    }

    @bind private async handleRemoveConfirmed() {
        await callApi(KICK_OFF_TEAM, { teamMemberId: this.props.details.id, });
        this.setState({
            showRemovePrompt: false,
        });
    }

    @bind private handleClosePrompt () {
        this.setState({ 
            showAdminPrompt: false,
            showRemovePrompt: false,
        });
    }
}

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    teamCode: string;
    teamName: string;
    saltinesBalance: number;
    saltinesBalanceAllTime: number;
    myName: string;
    isTeamAdmin: boolean;
    isOnline: boolean;
    otherTeamMembers: Array<OtherTeamMember>;
    leaders: List<LeaderboardEntry>;
}
interface State {
    teamView: boolean,
    editingTeam: boolean,
    showPrompt: boolean,
    showSwitchTeamPrompt: boolean,
}

class _TeamComponent extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = ({
            teamView: true,
            editingTeam: false,
            showPrompt: false,
            showSwitchTeamPrompt: false,
        });

        // Update the saltines balance:
        this.props.dispatch(updateMarketVars());
        this.props.dispatch(updateLeaderboards());
    }

    public render() {
        const { teamView } = this.state;
        return <div className="teams">
            <nav className="tabs">
                <button onClick={this.switchTab} value="team" className={teamView ? 'active' : ''}>Team</button>
                <button onClick={this.switchTab} className={teamView ? '' : 'active'}>Leaderboards</button>
            </nav>
            { teamView &&
                <div>
                    <h1>{this.props.teamName}</h1>
                    {this.props.otherTeamMembers.length < 4 && 
                        <p className="callout">Share your team code <span className="mono">{this.props.teamCode}</span> to recruit more team members. Your team has room for 5 players in total.</p>
                    }
                    <div className="saltines-count">
                        <h3>Saltines</h3>
                        <p><img height="20" width="20" src={saltine} alt="Saltine" /><span>{this.props.saltinesBalance}</span>(current balance)</p>
                        <p><img height="20" width="20" src={saltine} alt="Saltine" /><span>{this.props.saltinesBalanceAllTime}</span>(earned all-time)</p>
                    </div>
                    <h3>Your team {this.props.isTeamAdmin && <button onClick={this.editTeam}>{this.state.editingTeam ? 'Done Editing' : 'Edit Team'}</button>}</h3>
                    <ul className="team">
                        <TeamMemberRow isMe={true} details={{name: this.props.myName, id: 0, online: this.props.isOnline, isAdmin: this.props.isTeamAdmin}} editable={false} />
                        {this.props.otherTeamMembers.map(member =>
                            <TeamMemberRow key={member.id} details={member} editable={this.state.editingTeam} isMe={false} />
                        )}
                    </ul>
                    <button className="switch-teams" onClick={this.handleSwitchTeam}>Switch/start new team</button>
                    { this.state.showSwitchTeamPrompt &&
                        <Prompt
                            close={this.handleCloseSwitchTeamPrompt}
                            heading="Switch/start new team?"
                            show={this.state.showSwitchTeamPrompt}
                        >
                            <p>Are you sure you want to switch/start a new team? (You can always rejoin your current team later.)</p>
                            <button onClick={this.handleLeaveTeamButton}>Yes</button>
                        </Prompt>
                    }
                </div>
            }
            { !teamView &&
                <div>
                    <h1>Top Teams</h1>
                    <table className="leaderboards">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Team</th>
                                <th>Games</th>
                                <th>Pts</th>
                            </tr>
                        </thead>
                        <tbody>
                            {this.props.leaders.map((entry, key) => <tr key={key}>
                                <td>{entry.rank}</td>
                                <td>{entry.teamName}{entry.organization ? <span>{entry.organization}</span> : ''}</td>
                                <td>{entry.scenariosCompleted}</td>
                                <td>{entry.score}</td>
                            </tr>)}
                        </tbody>
                    </table>
                </div>
            }
        </div>;
    }

    @bind private switchTab(event: React.MouseEvent<HTMLButtonElement>) {
        const tab = event.currentTarget.value
        tab ? this.setState({ teamView: true }) : this.setState({ teamView: false })
    }

    @bind private editTeam(event: React.MouseEvent<HTMLButtonElement>) {
        if (this.props.isTeamAdmin) {
            this.setState(prevState => ({
                // If the player is an admin, toggle the editingTeam state
                editingTeam: !prevState.editingTeam
            }))
        }
    }

    @bind private handleSwitchTeam() {
        this.setState({
            showSwitchTeamPrompt: true,
        })
    }

    @bind private handleCloseSwitchTeamPrompt () {
        this.setState({ 
            showSwitchTeamPrompt: false,
        });
    }

    @bind private handleLeaveTeamButton() {
        this.props.dispatch(leaveTeam());
    }

}

export const TeamComponent = connect((state: RootState, ownProps: OwnProps) => {
    return {
        myName: state.userState.firstName,
        teamCode: state.teamState.teamCode,
        teamName: state.teamState.teamName,
        isTeamAdmin: state.teamState.isTeamAdmin,
        isOnline: state.rpcClientState.status === RpcClientConnectionStatus.Connected,
        saltinesBalance: state.teamState.saltinesBalance,
        saltinesBalanceAllTime: state.teamState.saltinesEarnedAllTime,
        otherTeamMembers: state.teamState.otherTeamMembers,
        leaders: state.leadersState.leaders,
    };
})(_TeamComponent);
