import bind from 'bind-decorator';
import * as React from 'react';
import { connect, DispatchProp } from 'react-redux';

import { RootState } from '../global/state';
import { List } from 'immutable';
import { loadScenarios, Actions } from './lobby-state-actions';
import { LoadingSpinnerComponent } from '../loading/loading-spinner';
import { LoadingState } from '../loading/loading-state';
import { Scenario } from '../../common/models';
import { AnyAction } from '../global/actions';


interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    teamCode: string|null; // Gets set after the team is successfully created
    scenarios: List<Scenario>;
    scenariosLoadState: LoadingState;
    selectedScenarioId: number|null;
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

        const selectedScenario = this.props.selectedScenarioId !== null ? this.props.scenarios.find(s => s.id === this.props.selectedScenarioId) : null;
        if (selectedScenario !== null) {
            return <div>
                <h1>{selectedScenario.name}</h1>
                Duration: {selectedScenario.duration_min} min<br/>
                Difficulty: {selectedScenario.difficulty}<br/>
                Start at: {selectedScenario.start_point_name}<br/>
                <br/>
                <div className="scenario-description" dangerouslySetInnerHTML={{__html: selectedScenario.description_html}}></div>
            </div>
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
                        <button onClick={() => { this.showScenarioDetails(s.id); }}>Info</button>
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

    @bind private showScenarioDetails(scenarioId: number) {
        this.props.dispatch<AnyAction>({type: Actions.SHOW_SCENARIO_DETAILS, scenarioId});
    }
}

export const ChooseScenarioComponent = connect((state: RootState, ownProps: OwnProps) => {
    const selectedScenarioId = state.lobbyState.showScenarioDetails;
    return {
        teamCode: state.teamState.teamCode,
        scenarios: state.lobbyState.scenarios,
        scenariosLoadState: state.lobbyState.scenariosState,
        selectedScenarioId,
    };
})(_ChooseScenarioComponent);
