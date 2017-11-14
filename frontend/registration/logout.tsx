import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {RootState} from '../global/state';
import {UserStateActions} from '../global/state/user-state-actions';


interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    hasJoinedTeam: boolean;
}

class _LogoutComponent extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
        // Bind event handlers:
        this.handleLogoutButton = this.handleLogoutButton.bind(this);
    }

    private handleLogoutButton() {
        this.props.dispatch({type: UserStateActions.LOGOUT});
    }

    public render() {
        return <div>
            <h1>Going so soon?</h1>
            <button disabled={!this.props.hasJoinedTeam}>Change team</button><br/>
            <button onClick={this.handleLogoutButton}>Log out</button>
        </div>;
    }
}

export const LogoutComponent = connect((state: RootState, ownProps: OwnProps) => ({
    hasJoinedTeam: state.teamState.hasJoinedTeam,
}))(_LogoutComponent);
