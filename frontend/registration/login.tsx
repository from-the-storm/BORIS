import bind from 'bind-decorator';
import * as React from 'react';


interface OwnProps {
}
interface Props extends OwnProps {
}
interface State {
    emailAddressEntered: string;
    errorMessage: string;
    waitingForServerResponse: boolean; // We've sent the email address to the server and are waiting for a reply (error or "ok, login link was emailed")
    loginLinkWasSent: boolean;
}

export class LoginComponent extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        // State:
        this.state = {
            emailAddressEntered: '',
            errorMessage: '',
            waitingForServerResponse: false,
            loginLinkWasSent: false,
        };
    }

    private get enableLoginButton(): boolean {
        return (
            !this.state.waitingForServerResponse &&
            !this.state.loginLinkWasSent &&
            this.state.emailAddressEntered && this.state.emailAddressEntered.indexOf('@') !== -1
        );
    }

    public render() {
        if (this.state.loginLinkWasSent) {
            return <div>
                <h1>Login</h1>
                <p><strong>Login link sent!</strong> Check your email and click the link to login.</p>
            </div>;
        }
        return <div>
            <h1>Login</h1>
            <p>Enter the email address you used to register. We'll email you a link to automatically log in.</p>
            <input type="email" disabled={this.state.waitingForServerResponse} placeholder="Your email address" value={this.state.emailAddressEntered} onChange={this.handleEmailChanged} />
            <button className="right" onClick={this.handleLoginButton} disabled={!this.enableLoginButton}>Log in</button>
            {this.state.errorMessage ?
                <div className="login-error">{this.state.errorMessage}</div>
            :null}
        </div>;
    }

    @bind private async handleLoginButton() {
        if (this.state.waitingForServerResponse) {
            throw new Error("Login already in progress.");
        }
        this.setState({waitingForServerResponse: true});
        try {
            const response = await fetch('/auth/request-login', {
                method: 'post',
                headers: new Headers({"Content-Type": "application/json"}),
                body: JSON.stringify({
                    email: this.state.emailAddressEntered,
                }),
            });
            if (response.ok) {
                this.setState({
                    waitingForServerResponse: false,
                    loginLinkWasSent: true,
                });
            } else {
                const data = await response.json();
                this.setState({
                    waitingForServerResponse: false,
                    errorMessage: `Unable to log you in: ${data.error}`,
                });
            }
        } catch (err) {
            this.setState({
                waitingForServerResponse: false,
                errorMessage: err.message,
            });
        }
    }

    @bind private handleEmailChanged(event: React.ChangeEvent<HTMLInputElement>) {
        const newValue = event.target.value.trim();
        this.setState({
            emailAddressEntered: newValue,
            errorMessage: '',
        })
    }
}
