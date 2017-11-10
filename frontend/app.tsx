import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {RootState} from './global/state';
import {LoginStatus} from './registration/login-status';

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
        // If the user is not logged in, display the login/register app:
        if (!this.props.isLoggedIn) {
            return <div id="app" className="boris-app registration">
                <h1>Hello from React!</h1>

                <LoginStatus />
            </div>;
        } else if (!this.props.hasJoinedTeam) { // If the user hasn't joined a team yet:
            return <div>
                <p> Choose or create a team</p>
            </div>;
        } else {
            return <div> This is the game itself </div>
        }
        
    }
}

export const App = connect((state: RootState, ownProps: OwnProps) => ({
    isLoggedIn: state.userState.isLoggedIn,
    hasJoinedTeam: state.teamState.hasJoinedTeam,
}))(_App);
