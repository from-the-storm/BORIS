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
import { startGame } from '../global/state/game-state-actions';


interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    teamCode: string|null; // Gets set after the team is successfully created
    scenarios: List<Scenario>;
    scenariosLoadState: LoadingState;
    selectedScenarioId: number|null;
}

class _ChooseScenarioComponent extends React.PureComponent<Props> {
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
                <div className={'scenario-title id-' + selectedScenario.id}>
                    <h1><span>{selectedScenario.name}</span></h1>
                </div>
                <div className="scenario-info details">
                    <span className={selectedScenario.difficulty}>{selectedScenario.difficulty}</span>
                    <span>{selectedScenario.duration_min} mins</span><br />
                    <span>Start at <a title="View on map" href="#">{selectedScenario.start_point_name}</a></span>
                </div>
                <button onClick={() => { this.startScenario(selectedScenario.id); }}>Start!</button>
                <div className="scenario-description" dangerouslySetInnerHTML={{__html: selectedScenario.description_html}}></div>
            </div>
        }

        return <div>
            <h1>Choose Scenario</h1>
            <p>Share your team code <span className='mono'>{this.props.teamCode}</span> to recruit more team members. You'll need 2-5 people to play. Then choose a scenario and head to its start point!</p>
            <div className="scenario-grid">
                <LoadingSpinnerComponent state={this.props.scenariosLoadState} onTryAgain={this.tryLoadingScenarios}>
                    {this.props.scenarios.map(s =>
                        <div key={s.id} className={'scenario-choice id-' + s.id}>
                            <div className="scenario-info">
                                <span className={s.difficulty}>{s.difficulty}</span><br />
                                <span>{s.duration_min} mins</span>
                                <h4>{s.name}</h4>
                                <span>Start at {s.start_point_name}</span>
                            </div>
                            <div className="scenario-buttons">
                                <button className="inverted" onClick={() => { this.showScenarioDetails(s.id); }}>Info?</button>
                                <button onClick={() => { this.startScenario(s.id); }}>Start!</button>
                            </div>
                        </div>
                    )}
                </LoadingSpinnerComponent>
            </div>
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

    @bind private startScenario(scenarioId: number) {
        this.props.dispatch(startGame(scenarioId));
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
