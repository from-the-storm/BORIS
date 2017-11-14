import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {RootState} from '../global/state';
import {HomeComponent} from './home';
import {RegisterComponent} from './register';
import {JoinTeamComponent} from './join-team';
import {LoginComponent} from './login';
import {LogoutComponent} from './logout';
import {Mode} from './registration-state';
import {Actions} from './registration-state-actions';

// Include our SCSS (via webpack magic)
import './registration.scss';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    isLoggedIn: boolean;
    mode: Mode;
    teamCode: string;
}

class _RegistrationComponent extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
        // Bind event handlers:
        this.handleHomeButton = this.handleHomeButton.bind(this);
        this.handleLoginButton = this.handleLoginButton.bind(this);
        this.handleLogoutButton = this.handleLogoutButton.bind(this);
        this.handleRegisterButton = this.handleRegisterButton.bind(this);
    }

    private handleHomeButton() { this.props.dispatch({type: Actions.SHOW_HOME}); }
    private handleLoginButton() { this.props.dispatch({type: Actions.SHOW_LOGIN}); }
    private handleLogoutButton() { this.props.dispatch({type: Actions.SHOW_LOGOUT}); }
    private handleRegisterButton() { this.props.dispatch({type: Actions.SHOW_REGISTER}); }

    public render() {
        return <div className="registration">
            <header>
                <div className="header-left">
                    {
                        this.props.mode === Mode.Home && this.props.isLoggedIn ? <button>Start</button> :
                        this.props.mode === Mode.Home && !this.props.isLoggedIn ? <button onClick={this.handleRegisterButton}>Register!</button> :
                        <button onClick={this.handleHomeButton}>Home</button>
                    }
                </div>
                <div className="header-right">
                    {
                        this.props.isLoggedIn ? <div>Logged in as NAME.<br/>TEAM CODE: {this.props.teamCode || '----'} <button onClick={this.handleLogoutButton}>Log out</button> </div> :
                        <button onClick={this.handleLoginButton}>Log In!</button>
                    }
                </div>
            </header>
            <div className="content">
                {
                    this.props.mode === Mode.Register ? <RegisterComponent/> :
                    this.props.mode === Mode.Login ? <LoginComponent/> :
                    this.props.mode === Mode.JoinTeam ? <JoinTeamComponent/> :
                    this.props.mode === Mode.Home ? <HomeComponent/> :
                    this.props.mode === Mode.Logout ? <LogoutComponent/> :
                    'Error: Unknown mode.'
                }
            </div>
        </div>;
    }
}

export const RegistrationComponent = connect((state: RootState, ownProps: OwnProps) => ({
    isLoggedIn: state.userState.isLoggedIn,
    mode: state.registrationState.mode,
    teamCode: state.teamState.teamCode,
}))(_RegistrationComponent);
