import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {RootState} from './global/state';
import {RegistrationComponent} from './registration/registration';

// Include our SCSS (via webpack magic)
import './global/global-styles.scss';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    isLoggedIn: boolean;
    hasJoinedTeam: boolean;
}

class _App extends React.PureComponent<Props> {
    public render() {
        if (true /* User hasn't logged in, hasn't joined a team, or hasn't clicked "Start"*/) {
            return <RegistrationComponent/>;
        } else {
            //return <p>The actual game itself comes here.</p>;
        }
    }
}

export const App = connect((state: RootState, ownProps: OwnProps) => ({
    isLoggedIn: state.userState.isLoggedIn,
    hasJoinedTeam: state.teamState.hasJoinedTeam,
}))(_App);
