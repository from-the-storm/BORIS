import bind from 'bind-decorator';
import * as React from 'react';
import { connect, DispatchProp } from 'react-redux';

import { RootState } from '../global/state';
import { OtherTeamMember, Scenario } from '../../common/models';
import { RpcClientConnectionStatus } from '../rpc-client/rpc-client-actions';
import { startGame } from '../global/state/game-state-actions';
import { callApi } from '../api';
import { KICK_OFF_TEAM } from '../../common/api';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    scenario: Scenario;
    teamCode: string;
    teamName: string;
    myName: string;
    isTeamAdmin: boolean;
    onlineTeamMembers: Array<OtherTeamMember>;
    offlineTeamMembers: Array<OtherTeamMember>;
}
interface State {
}

class _PreLaunchComponent extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = ({
        });
    }

    public render() {

        const canPlay = (
            this.props.offlineTeamMembers.length === 0 &&
            this.props.onlineTeamMembers.length >= 2 && 
            this.props.onlineTeamMembers.length <= 5
        );

        return <div className="pre-launch">
            <h1>{this.props.scenario.name}</h1>
            <h2>Confirm your team</h2>
            <p>Before you begin, make sure you're all at the starting point (and that your phones are charged).</p>
            <h3>Team Members Ready to Play</h3>
            <ul className="team online">
                {this.props.onlineTeamMembers.map(member =>
                    <li key={member.id}>{member.name}</li>
                )}
            </ul>
            {
                this.props.offlineTeamMembers.length > 0 ?
                    <>
                        <h3>Offline Team Members</h3>
                        <ul className="team offline">
                            {this.props.offlineTeamMembers.map(member =>
                                <li key={member.id}>
                                    {member.name}
                                    {this.props.isTeamAdmin ? <button aria-label="Remove team member" onClick={() => this.removeTeamMember(member.id)}>X</button> : null }
                                </li>
                            )}
                        </ul>
                        <p className="callout">
                            <strong>⚠️ Some of your team members are offline.</strong> If they're with you now, make sure they've logged in. If they aren't here, {this.props.isTeamAdmin ? 'you' : 'your team admin'} can temporarily boot them from your team and then start the scenario.
                        </p>
                    </>
                :
                    null
            }
            <button onClick={() => { this.startScenario(this.props.scenario.id) }} disabled={!canPlay}>Start Scenario</button>
        </div>;
    }

    private startScenario(scenarioId: number) {
        this.props.dispatch(startGame(scenarioId));
    }

    private async removeTeamMember(teamMemberId: number) {
        await callApi(KICK_OFF_TEAM, { teamMemberId, });
    }
}

export const PreLaunchComponent = connect((state: RootState, ownProps: OwnProps) => {

    const isOnline = state.rpcClientState.status === RpcClientConnectionStatus.Connected;

    const currentUserInfo: OtherTeamMember = {
        name: state.userState.firstName,
        id: 0,
        online: isOnline,
        isAdmin: state.teamState.isTeamAdmin,
    };

    const onlineTeamMembers: OtherTeamMember[] = state.teamState.otherTeamMembers.filter(tm => tm.online);
    const offlineTeamMembers: OtherTeamMember[] = state.teamState.otherTeamMembers.filter(tm => !tm.online);

    if (isOnline) {
        onlineTeamMembers.push(currentUserInfo);
    } else {
        offlineTeamMembers.push(currentUserInfo);
    }
    // Sort team member names:
    onlineTeamMembers.sort((tm1, tm2) => tm1.name.localeCompare(tm2.name));
    offlineTeamMembers.sort((tm1, tm2) => tm1.name.localeCompare(tm2.name));

    return {
        scenario: state.lobbyState.scenarios.find(s => s.id === state.lobbyState.selectedScenario),
        myName: state.userState.firstName,
        teamCode: state.teamState.teamCode,
        teamName: state.teamState.teamName,
        isTeamAdmin: state.teamState.isTeamAdmin,
        onlineTeamMembers,
        offlineTeamMembers,
    };
})(_PreLaunchComponent);
