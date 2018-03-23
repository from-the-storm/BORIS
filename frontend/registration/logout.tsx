import bind from 'bind-decorator';
import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import { RootState } from '../global/state';
import { logoutUser } from '../global/state/user-state-actions';
import { leaveTeam } from '../global/state/team-state-actions';


interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    hasJoinedTeam: boolean;
}

class _LogoutComponent extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
    }

    @bind private handleLeaveTeamButton() {
        this.props.dispatch(leaveTeam());
    }

    @bind private handleLogoutButton() {
        this.props.dispatch(logoutUser());
    }

    public render() {
        return <div>
            <h1>Going so soon?</h1>
            <div className="button-split full">
                <button disabled={!this.props.hasJoinedTeam} onClick={this.handleLeaveTeamButton}>Change team</button>
                <button onClick={this.handleLogoutButton}>Log out</button>
            </div>
        </div>;
    }
}

export const LogoutComponent = connect((state: RootState, ownProps: OwnProps) => ({
    hasJoinedTeam: state.teamState.hasJoinedTeam,
}))(_LogoutComponent);
