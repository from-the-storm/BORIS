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
import * as backfeed from '../other-images/backfeed.png';

// Include our SCSS (via webpack magic)
import './lobby.scss';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    mode: Mode;
    viewingScenarioDetails: boolean;
    firstName: string;
    userId: number;
    userEmail: string;
}
interface State {
    seenResearchPrompt: boolean;
    showResearchPrompt: boolean;
}

class _LobbyComponent extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { 
            showResearchPrompt: true,
            seenResearchPrompt: false
         };
    }

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
        const firstNameEncoded = encodeURIComponent(this.props.firstName);
        const emailEncoded = encodeURIComponent(this.props.userEmail);
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
            <Prompt close={this.handleDeclineResearchPrompt}
                show={this.state.showResearchPrompt && !this.state.seenResearchPrompt}
                fullscreen
            >
                <div className="prompt-image"><img width="280" height="450" src={backfeed} alt="Backfeed" /></div>
                <p>Welcome. Before you begin, why not join a very very ethical research study? It'll only take a few minutes to set up and pays modestly well. Then you can jump right back into the apocalypse training.</p>
                <div className="button-split">
                    <a className="research no" onClick={this.handleDeclineResearchPrompt}>Not interested</a>
                    <a className="research" target="_blank" rel="noopener noreferrer" href={`http://dev.propelsurveysolutions.ca/registration/en/activity/197/1605/?email=${emailEncoded}&foreignid=${this.props.userId}&firstname=${firstNameEncoded}&gender=male&age=25-34`}>TELL ME MORE</a>
                </div>
            </Prompt>
        </RpcConnectionStatusIndicator>;
    }

    @bind private handleDeclineResearchPrompt() {
        this.setState({
            showResearchPrompt: false,
            seenResearchPrompt: true
        });
    }
}

export const LobbyComponent = connect((state: RootState, ownProps: OwnProps) => ({
    mode: state.lobbyState.mode,
    viewingScenarioDetails: state.lobbyState.selectedScenario !== null,
    firstName: state.userState.firstName,
    userId: state.userState.id,
    userEmail: state.userState.email,
}))(_LobbyComponent);
