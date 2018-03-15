import {bind} from 'bind-decorator';
import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {RootState} from '../global/state';
import { ChooseScenarioComponent } from './choose-scenario';
import {Mode} from './lobby-state';
//import {Actions} from './lobby-state-actions';

// Include our SCSS (via webpack magic)
import './lobby.scss';
import { Actions as RegistrationActions } from '../registration/registration-state-actions';
import { AnyAction } from '../global/actions';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    mode: Mode;
}

class _LobbyComponent extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
    }

    @bind private handleHomeButton() { this.props.dispatch<AnyAction>({type: RegistrationActions.SHOW_HOME}); }

    public render() {
        return <div className="lobby">
            <header>
                <button onClick={this.handleHomeButton}>◀</button>
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
}))(_LobbyComponent);
