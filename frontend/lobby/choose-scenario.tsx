import bind from 'bind-decorator';
import * as React from 'react';
import { connect, DispatchProp } from 'react-redux';

import { RootState } from '../global/state';
import { List } from 'immutable';
import { loadScenarios } from './lobby-state-actions';
import { LoadingSpinnerComponent } from '../loading/loading-spinner';
import { LoadingState } from '../loading/loading-state';
import { Scenario } from '../../common/models';


interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    teamCode: string|null; // Gets set after the team is successfully created
    scenarios: List<Scenario>;
    scenariosLoadState: LoadingState;
}
interface State {
}

class _ChooseScenarioComponent extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
    }
    public render() {
        if (this.props.teamCode === null) {
            return <div>Error: you must have joined a team to see the scenario list.</div>;
        }

        return <div>
            <h1>Choose Scenario</h1>
            <p>Share your team code <span className='mono'>{this.props.teamCode}</span> to recruit more team members. Your team should include 2 to 5 people. Then bring yourselves (and your phones) to a scenario start point.</p>
            <LoadingSpinnerComponent state={this.props.scenariosLoadState} onTryAgain={this.tryLoadingScenarios}>
                {this.props.scenarios.map(s =>
                    <div key={s.id} className="scenario-choice">
                        <strong>{s.name}</strong><br/>
                        Duration: {s.duration_min} min<br/>
                        Difficulty: {s.difficulty}<br/>
                        Start at: {s.start_point_name}<br/>
                    </div>
                )}
            </LoadingSpinnerComponent>
        </div>;
    }

    public componentDidMount() {
        this.tryLoadingScenarios();
    }

    @bind private tryLoadingScenarios() {
        this.props.dispatch(loadScenarios());
    }
}

export const ChooseScenarioComponent = connect((state: RootState, ownProps: OwnProps) => ({
    teamCode: state.teamState.teamCode,
    scenarios: state.lobbyState.scenarios,
    scenariosLoadState: state.lobbyState.scenariosState,
}))(_ChooseScenarioComponent);
