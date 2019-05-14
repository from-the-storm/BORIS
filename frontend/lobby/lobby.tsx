import {bind} from 'bind-decorator';
import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {RootState} from '../global/state';
import { ChooseScenarioComponent } from './choose-scenario';
import { TeamComponent } from './team';
import { PreLaunchComponent } from './pre-launch';
import { Prompt } from '../prompt/prompt';
import {Mode} from './lobby-state';
import {Actions} from './lobby-state-actions';
import { Actions as RegistrationActions } from '../registration/registration-state-actions';
import { AnyAction } from '../global/actions';
import { RpcConnectionStatusIndicator } from '../rpc-client/rpc-status-indicator';

import * as back from './images/back.svg';
import * as teams from './images/teams-icon.svg';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    mode: Mode;
    viewingScenarioDetails: boolean;
    firstName: string;
    userId: number;
}
interface State {
}

class _LobbyComponent extends React.PureComponent<Props, State> {

    @bind private handleBackButton() {
        if (this.props.mode === Mode.ChooseScenario && this.props.viewingScenarioDetails) {
            this.props.dispatch<AnyAction>({type: Actions.SHOW_SCENARIOS_LIST});
        } else if (this.props.mode === Mode.TeamDetails) {
            this.props.dispatch<AnyAction>({type: Actions.SHOW_SCENARIOS_LIST});
        } else if (this.props.mode === Mode.PreLaunch) {
            this.props.dispatch<AnyAction>({type: Actions.SHOW_SCENARIOS_LIST});
        } else {
            this.props.dispatch<AnyAction>({type: RegistrationActions.SHOW_HOME});
        }
    }

    @bind private handleTeamButton() {
        this.props.dispatch<AnyAction>({type: Actions.SHOW_TEAM_DETAILS});
    }

    public render() {
        return <RpcConnectionStatusIndicator>
            <div className="lobby">
                <header className="fixed">
                    <button onClick={this.handleBackButton}><img height="22" width="22" src={back} alt="Back" /></button>
                    <button onClick={this.handleTeamButton}><img height="22" width="22" src={teams} alt="Teams" /></button>
                </header>
                <div className="content">
                    {
                        this.props.mode === Mode.ChooseScenario ? <ChooseScenarioComponent/> :
                        this.props.mode === Mode.TeamDetails ? <TeamComponent/> :
                        this.props.mode === Mode.PreLaunch ? <PreLaunchComponent/> :
                        'Error: Unknown mode.'
                    }
                </div>
            </div>
        </RpcConnectionStatusIndicator>;
    }

    public componentDidUpdate(prevProps: Props, prevState: State) {
        if (this.props.mode != prevProps.mode) {
            // When the screen changes, scroll back to the top.
            window.scrollTo({top: 0});
        }
    }
}

export const LobbyComponent = connect((state: RootState, ownProps: OwnProps) => ({
    mode: state.lobbyState.mode,
    viewingScenarioDetails: state.lobbyState.selectedScenario !== null,
    firstName: state.userState.firstName,
    userId: state.userState.id,
}))(_LobbyComponent);
