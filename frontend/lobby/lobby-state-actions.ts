import {Dispatch} from 'redux';
import { callApi } from '../api';
import { GET_SCENARIOS } from '../../common/api';

//// Interfaces

import { Scenario } from '../../common/models';

//// User State Actions

export enum Actions {
    // LS_ prefix means Lobby State
    SCENARIOS_LOADING = 'LS_LOAD',
    SCENARIOS_LOADED = 'LS_SL',
    SCENARIOS_FAILED_TO_LOAD = 'LS_SFTL',
    // Show the main list of scenarios
    SHOW_SCENARIOS_LIST = 'LS_SSL',
    // Show the details of a specific scenario
    SHOW_SCENARIO_DETAILS = 'LS_SD',
}

interface ScenariosLoadingAction { type: Actions.SCENARIOS_LOADING; }
interface ScenariosFailedToLoadAction { type: Actions.SCENARIOS_FAILED_TO_LOAD; }
interface ScenariosLoadedAction {
    type: Actions.SCENARIOS_LOADED;
    scenarios: Scenario[];
}
interface ShowScenariosListAction { type: Actions.SHOW_SCENARIOS_LIST; }
interface ShowScenarioDetailsAction { type: Actions.SHOW_SCENARIO_DETAILS; scenarioId: number; }

export type LobbyStateActionsType = (
    ScenariosLoadingAction|
    ScenariosLoadedAction|
    ScenariosFailedToLoadAction|
    ShowScenariosListAction|
    ShowScenarioDetailsAction
);

//// Action Creators

/** 
 * Load the list of scenarios from the server.
 */
export function loadScenarios() {
    return async (dispatch: Dispatch<{}>, getState: () => {}) => {
        dispatch<LobbyStateActionsType>({type: Actions.SCENARIOS_LOADING});
        try {
            const response = await callApi(GET_SCENARIOS, {});
            dispatch<LobbyStateActionsType>({
                type: Actions.SCENARIOS_LOADED,
                scenarios: response.scenarios,
            });
        } catch (error) {
            dispatch<LobbyStateActionsType>({type: Actions.SCENARIOS_FAILED_TO_LOAD});
        }
    };
}
