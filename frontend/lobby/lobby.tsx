import {bind} from 'bind-decorator';
import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {RootState} from '../global/state';
import { ChooseScenarioComponent } from './choose-scenario';
import {Mode} from './lobby-state';
import {Actions} from './lobby-state-actions';
import { Actions as RegistrationActions } from '../registration/registration-state-actions';
import { AnyAction } from '../global/actions';

// Include our SCSS (via webpack magic)
import './lobby.scss';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    mode: Mode;
    viewingScenarioDetails: boolean;
}

class _LobbyComponent extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
    }

    @bind private handleBackButton() {
        if (this.props.mode === Mode.ChooseScenario && this.props.viewingScenarioDetails) {
            this.props.dispatch<AnyAction>({type: Actions.SHOW_SCENARIOS_LIST});
        } else {
            this.props.dispatch<AnyAction>({type: RegistrationActions.SHOW_HOME});
        }
    }

    public render() {
        return <div className="lobby">
            <header>
                <button onClick={this.handleBackButton}>◀</button>
            </header>
            <div className="content">
                {
                    this.props.mode === Mode.ChooseScenario ? <ChooseScenarioComponent/> :
                    'Error: Unknown mode.'
                }
            </div>
        </div>;
    }
}

export const LobbyComponent = connect((state: RootState, ownProps: OwnProps) => ({
    mode: state.lobbyState.mode,
    viewingScenarioDetails: state.lobbyState.showScenarioDetails !== null,
}))(_LobbyComponent);
