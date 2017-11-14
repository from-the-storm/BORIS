import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {RootState} from '../global/state';


interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
}

class _JoinTeamComponent extends React.PureComponent<Props> {
    public render() {
        return <div>
            <h1>Join Team</h1>
            <button>Join a Team</button> <br/>
            <button>Create a Team</button>
            <h2>Recent teams</h2>
            <p>You have not recently joined any teams</p>
        </div>;
    }
}

export const JoinTeamComponent = connect((state: RootState, ownProps: OwnProps) => ({
}))(_JoinTeamComponent);
