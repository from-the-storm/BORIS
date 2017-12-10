import bind from 'bind-decorator';
import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {RootState} from '../global/state';
import {loginUser} from '../global/state/user-state-actions';


interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
}
interface State {
    emailAddressEntered: string;
    enableLoginButton: boolean;
}

class _LoginComponent extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        // State:
        this.state = {
            emailAddressEntered: '',
            enableLoginButton: false,
        };
    }

    public render() {
        return <div>
            <h1>Login</h1>
            <p>Enter the email address you used to register. We'll email you a link to automatically log in.</p>
            <input type="email" placeholder="Your email address" value={this.state.emailAddressEntered} onChange={this.handleEmailChanged} />
            <button onClick={this.handleLoginButton} disabled={!this.state.enableLoginButton}>Log in</button>
        </div>;
    }

    @bind private handleLoginButton() {
        this.props.dispatch(loginUser(this.state.emailAddressEntered));
    }

    @bind private handleEmailChanged(event: React.ChangeEvent<HTMLInputElement>) {
        const newValue = event.target.value.trim();
        this.setState({
            emailAddressEntered: newValue,
            enableLoginButton: newValue.indexOf('@') !== -1,
        })
    }
}

export const LoginComponent = connect((state: RootState, ownProps: OwnProps) => ({
    //
}))(_LoginComponent);
