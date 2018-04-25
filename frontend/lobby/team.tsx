import bind from 'bind-decorator';
import * as React from 'react';
import { connect, DispatchProp } from 'react-redux';

import { RootState } from '../global/state';
import { Actions } from './lobby-state-actions';
import { Scenario, OtherTeamMember } from '../../common/models';
import { AnyAction } from '../global/actions';
import { RpcClientConnectionStatus } from '../rpc-client/rpc-client-actions';

import * as saltine from './images/saltine.svg';



class OnlineIndicator extends React.PureComponent<{when: boolean}> {
    public render() {
        if (this.props.when) {
            return <span className="online-indicator"><span className="visually-hidden">online</span></span>
        }
        return null;
    }
}
class AdminIndicator extends React.PureComponent<{when: boolean}> {
    public render() {
        if (this.props.when) {
            return <span className="admin-indicator badge">admin</span>
        }
        return null;
    }
}

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    teamCode: string;
    teamName: string;
    totalPoints: number;
    totalPointsAllTime: number;
    myName: string;
    isTeamAdmin: boolean;
    isOnline: boolean;
    otherTeamMembers: Array<OtherTeamMember>;
}
interface State {
    teamView: boolean,
    hasSeenSplash: boolean
}

class _TeamComponent extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = ({
            teamView: true,
            hasSeenSplash: false,
        })
    }

    @bind splashDone() {
        this.setState({
            hasSeenSplash: true,
        })
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
                    <div className="saltines-count">
                        <h3>Saltines</h3>
                        <p><img height="20" width="20" src={saltine} alt="Saltine" /><span>{this.props.totalPoints}</span>(current balance)</p>
                        <p><img height="20" width="20" src={saltine} alt="Saltine" /><span>{this.props.totalPointsAllTime}</span>(earned all-time)</p>
                    </div>
                    <div className="rankings-snapshot">
                        <h3>Rank</h3>
                        <button onClick={this.switchTab}><sup>#</sup>2<span>in Vancouver</span></button>
                        <button onClick={this.switchTab}><sup>#</sup>78<span>in Canada</span></button>
                    </div>
                    <h3>Your team</h3>
                    <ul className="team">
                        <li>{this.props.isTeamAdmin && <button onClick={this.switchTeamAdmin}>X</button>}{this.props.myName} (That's you!) <OnlineIndicator when={this.props.isOnline}/> <AdminIndicator when={this.props.isTeamAdmin}/> </li>
                        {this.props.otherTeamMembers.map(member =>
                            <li key={member.id}>{member.name} <OnlineIndicator when={member.online}/> <AdminIndicator when={member.isAdmin}/>{this.props.isTeamAdmin && <button value={member.name} onClick={this.removeTeamMember}>X</button>} </li>
                        )}
                        {this.props.otherTeamMembers.length < 4 && <li><button onClick={this.addTeamMemberPrompt}>Add Team Member</button></li>}
                    </ul>
                </div>
            }
            { !teamView &&
                <div>
                    <p>Here be the leaderboards component.</p>
                </div>
            }
            
        </div>;
    }

    @bind private switchTab(event: React.MouseEvent<HTMLButtonElement>) {
        const tab = event.currentTarget.value
        tab ? this.setState({ teamView: true }) : this.setState({ teamView: false })
    }

    @bind private addTeamMemberPrompt(event: React.MouseEvent<HTMLButtonElement>) {
        confirm('To add someone to your team, give them your team code: ' + this.props.teamCode + '. Your team can have a maximum of 5 people.')
    }

    private removeTeamMember(event: React.MouseEvent<HTMLButtonElement>) {
        const name = event.currentTarget.value
        confirm('Do you want to give ' + name + 'the unceremonious boot?')
    }

    private switchTeamAdmin(event: React.MouseEvent<HTMLButtonElement>) {
        confirm('Do you want to remove yourself as the team leader?')
    }
}

export const TeamComponent = connect((state: RootState, ownProps: OwnProps) => {
    const selectedScenarioId = state.lobbyState.showScenarioDetails;
    return {
        myName: state.userState.firstName,
        teamCode: state.teamState.teamCode,
        teamName: state.teamState.teamName,
        isTeamAdmin: state.teamState.isTeamAdmin,
        isOnline: state.rpcClientState.status === RpcClientConnectionStatus.Connected,
        totalPoints: 70,
        totalPointsAllTime: 90,
        otherTeamMembers: state.teamState.otherTeamMembers,
    };
})(_TeamComponent);
