import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {RootState} from '../global/state';
import {loginUser} from '../global/state/user-state-actions';


interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
}

class _LoginComponent extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
        // State:
        this.state = {
            showLogoutMenu: false,
        };
        // Bind event handlers:
        this.handleLoginButton = this.handleLoginButton.bind(this);
    }

    private handleLoginButton() {
        this.props.dispatch(loginUser("braden@apocalypsemadeeasy.com"));
    }

    public render() {
        return <div>
            <h1>Login</h1>
            <p>Enter the email address you used to register. We'll email you a link to automatically log in.</p>
            <input type="email"/>
            <button onClick={this.handleLoginButton}>Log in</button>
        </div>;
    }
}

export const LoginComponent = connect((state: RootState, ownProps: OwnProps) => ({
    //
}))(_LoginComponent);
