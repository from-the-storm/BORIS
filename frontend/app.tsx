import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import { RootState } from './global/state';
import { Mode as RegistrationMode } from './registration/registration-state';
import { LobbyComponent } from './lobby/lobby';
import { RegistrationComponent } from './registration/registration';
import { GameComponent } from './game/game';

// Include our SCSS (via webpack magic)
import './global/global-styles.scss';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    isLoggedIn: boolean;
    hasJoinedTeam: boolean;
    isPlaying: boolean;
    readyToPlay: boolean;
}

class _App extends React.PureComponent<Props> {
    public render() {
        if (this.props.isPlaying) {
            return <GameComponent/>;
        } else if (this.props.readyToPlay) {
            return <LobbyComponent/>;
        } else {
            return <RegistrationComponent/>;
        }
    }
}

export const App = connect((state: RootState, ownProps: OwnProps) => ({
    isLoggedIn: state.userState.isLoggedIn,
    hasJoinedTeam: state.teamState.hasJoinedTeam,
    isPlaying: state.gameState.isActive,
    readyToPlay: state.registrationState.mode === RegistrationMode.ReadyToPlay,
}))(_App);
