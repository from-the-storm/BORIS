import {bind} from 'bind-decorator';
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
    userName: string;
}

class _RegistrationComponent extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
    }

    @bind private handleHomeButton() { this.props.dispatch({type: Actions.SHOW_HOME}); }
    @bind private handleLoginButton() { this.props.dispatch({type: Actions.SHOW_LOGIN}); }
    @bind private handleLogoutButton() { this.props.dispatch({type: Actions.SHOW_LOGOUT}); }
    @bind private handleRegisterButton() { this.props.dispatch({type: Actions.SHOW_REGISTER}); }

    public render() {
        return <div className="registration">
            <header>
                <div className="header-left">
                    {
                        this.props.mode === Mode.Home && this.props.isLoggedIn ? <button><span className="start">Start</span></button> :
                        this.props.mode === Mode.Home && !this.props.isLoggedIn ? <button onClick={this.handleRegisterButton}>Register!</button> :
                        <button onClick={this.handleHomeButton}>Home</button>
                    }
                </div>
                <div className="header-right">
                    {
                        this.props.isLoggedIn ? <div className="loggedin">Logged in as {this.props.userName}.<br/><span className="emphatic">TEAM CODE:</span> <span className="mono">{this.props.teamCode || '----'}</span> <button className="small" onClick={this.handleLogoutButton}>Log out</button> </div> :
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
    userName: state.userState.firstName,
}))(_RegistrationComponent);
