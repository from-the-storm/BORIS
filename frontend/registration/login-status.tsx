import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {UserState, RootState} from '../global/state';
import {loginUser} from '../global/state/user-state-actions';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    userState: UserState;
}

class _LoginStatus extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
        this.handleLogin = this.handleLogin.bind(this);
    }

    public render() {
        if (this.props.userState.isLoggedIn) {
            return <p>You are logged in as {`${this.props.userState.first_name}`}.</p>;
        }
        return <div>
            <p>You are not logged in.</p>
            <button onClick={this.handleLogin}>Log In</button>
        </div>;
    }

    private handleLogin() {
        this.props.dispatch(loginUser("braden@apocalypsemadeeasy.com"));
    }
}

export const LoginStatus = connect((state: RootState, ownProps: OwnProps) => ({
    userState: state.userState,
}))(_LoginStatus);
