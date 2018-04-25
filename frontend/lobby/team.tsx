import bind from 'bind-decorator';
import * as React from 'react';
import { connect, DispatchProp } from 'react-redux';

import { RootState } from '../global/state';
import { Actions } from './lobby-state-actions';
import { Scenario, OtherTeamMember } from '../../common/models';
import { AnyAction } from '../global/actions';
import { RpcClientConnectionStatus } from '../rpc-client/rpc-client-actions';


class OnlineIndicator extends React.PureComponent<{when: boolean}> {
    public render() {
        if (this.props.when) {
            return <span className="online-indicator">(online)</span>
        }
        return null;
    }
}
class AdminIndicator extends React.PureComponent<{when: boolean}> {
    public render() {
        if (this.props.when) {
            return <span className="admin-indicator">(admin)</span>
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
}

class _TeamComponent extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
    }

    @bind splashDone() {
        this.setState({
            hasSeenSplash: true,
        })
    }

    public render() {
        return <div>
            <h1>Team</h1>
            <h2>{this.props.teamName}</h2>
            <table>
                <tbody>
                    <tr>
                        <td>Total points:</td>
                        <td>{this.props.totalPointsAllTime}</td>
                    </tr>
                    <tr>
                        <td>Saltines:</td>
                        <td>{this.props.totalPoints}</td>
                    </tr>
                </tbody>
            </table>
            <h3>Your team</h3>
            <ul>
                <li>{this.props.myName} (You!) <OnlineIndicator when={this.props.isOnline}/> <AdminIndicator when={this.props.isTeamAdmin}/> </li>
                {this.props.otherTeamMembers.map(member =>
                    <li key={member.id}>{member.name} <OnlineIndicator when={member.online}/> <AdminIndicator when={member.isAdmin}/> </li>
                )}
            </ul>
        </div>;
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
