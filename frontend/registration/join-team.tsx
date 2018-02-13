import { bind } from 'bind-decorator';
import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {RootState} from '../global/state';
import { Actions } from './registration-state-actions';


interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
}

class _JoinTeamComponent extends React.PureComponent<Props> {
    public render() {
        return <div>
            <h1>Join Team</h1>
            <div className="button-split full">
                <button>Join a Team</button>
                <button onClick={this.handleCreateTeam}>Create a Team</button>
            </div>
            <h2>Recent teams</h2>
            <p>You have not recently joined any teams.</p>
        </div>;
    }

    @bind private handleCreateTeam() {
        this.props.dispatch({type: Actions.SHOW_CREATE_TEAM});
    }
}

export const JoinTeamComponent = connect((state: RootState, ownProps: OwnProps) => ({
}))(_JoinTeamComponent);
