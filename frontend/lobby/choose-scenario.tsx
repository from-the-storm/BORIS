import bind from 'bind-decorator';
import * as React from 'react';
import { connect, DispatchProp } from 'react-redux';

import { RootState } from '../global/state';
import { List } from 'immutable';
import { loadScenarios, Actions } from './lobby-state-actions';
import { LoadingSpinnerComponent } from '../loading/loading-spinner';
import { LoadingState } from '../loading/loading-state';
import { AutoWayfinder } from '../auto-wayfinder/auto-wayfinder';
import { MarketButton } from './market-button';
import { Scenario } from '../../common/models';
import { AnyAction } from '../global/actions';
import { updateMarketVars } from '../global/state/team-state-actions';
import { MarketStatus } from '../../common/api';


interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    teamCode: string|null; // Gets set after the team is successfully created
    scenarios: List<Scenario>;
    scenariosLoadState: LoadingState;
    selectedScenarioId: number|null;
    allowMarket: boolean;
    marketStatus: MarketStatus;
}
interface State {
    showMap: boolean;
    chosenCity: string;
}

const LAST_CITY = 'last-city'; // Key to remember which city the user chose via localStorage

class _ChooseScenarioComponent extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = ({
            showMap: true,
            chosenCity: localStorage.getItem(LAST_CITY) || 'vancouver',
        });
        // Update the vars that affect whether we show the market:
        this.props.dispatch(updateMarketVars());
    }

    @bind handleShowMap() {
        this.setState(prevState => ({
            showMap: !prevState.showMap
        }))
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
                    <span>Start at {selectedScenario.start_point_name}. <a title="Toggle map" onClick={this.handleShowMap}>(Toggle Map)</a></span>
                    {this.state.showMap &&
                        <AutoWayfinder lat={selectedScenario.start_point.lat} lng={selectedScenario.start_point.lng} />
                    }
                </div>
                <button onClick={() => { this.startScenario(selectedScenario.id); }}>Start!</button>
                <div className="scenario-description" dangerouslySetInnerHTML={{__html: selectedScenario.description_html}}></div>
            </div>
        }
        
        const { chosenCity } = this.state;

        return <div>
          <h1>Choose Scenario</h1>
          {this.props.marketStatus === MarketStatus.Hidden ? 
            (<p>Share your team code <span className='mono'>{this.props.teamCode}</span> to recruit more team members. You'll need 2-5 people to play. Then choose your city, pick a scenario, and head to its start point!</p>) : 
            (<MarketButton status={this.props.marketStatus} onClick={this.handleMarketButtonClicked} />)
          }
          <nav className="tabs city">
            <button value="vancouver" onClick={this.chooseCity} className={chosenCity === 'vancouver' ? 'active' : ''}>Vancouver</button>
            <button value="kelowna" onClick={this.chooseCity} className={chosenCity === 'kelowna' ? 'active' : ''}>Kelowna</button>
            {/* <button value="hidden" onClick={this.chooseCity} className={chosenCity === 'hidden' ? 'active' : ''}>Hidden</button> */}
          </nav>
          <div className='scenario-grid'>
            <LoadingSpinnerComponent state={this.props.scenariosLoadState} onTryAgain={this.tryLoadingScenarios}>
              {this.props.scenarios.filter(s => s.city === chosenCity).map(s =>
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

    public componentDidUpdate(prevProps: Props, prevState: State) {
        if (this.props.selectedScenarioId !== prevProps.selectedScenarioId) {
            // When the screen changes, scroll back to the top.
            window.scrollTo({top: 0});
        }
    }

    @bind private tryLoadingScenarios() {
        this.props.dispatch(loadScenarios());
    }

    @bind private showScenarioDetails(scenarioId: number) {
        this.setState({showMap: true});
        this.props.dispatch<AnyAction>({type: Actions.SHOW_SCENARIO_DETAILS, scenarioId});
    }

    @bind private startScenario(scenarioId: number) {
        this.props.dispatch<AnyAction>({type: Actions.SHOW_PRE_LAUNCH_SCREEN, scenarioId});
    }

    @bind private handleMarketButtonClicked() {
        if (this.props.allowMarket) {
            this.props.dispatch<AnyAction>({type: Actions.SHOW_MARKET});
        }
    }

    @bind private chooseCity(event: React.MouseEvent<HTMLButtonElement>) {
      const city = event.currentTarget.value;
      this.setState({ chosenCity: city });
      localStorage.setItem(LAST_CITY, city);
  }
}

export const ChooseScenarioComponent = connect((state: RootState, ownProps: OwnProps) => {
    const selectedScenarioId = state.lobbyState.selectedScenario;
    return {
        teamCode: state.teamState.teamCode,
        scenarios: state.lobbyState.scenarios,
        scenariosLoadState: state.lobbyState.scenariosState,
        selectedScenarioId,
        allowMarket: state.teamState.allowMarket,
        marketStatus: state.teamState.marketStatus,
    };
})(_ChooseScenarioComponent);
