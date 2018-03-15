import {Dispatch} from 'redux';
import { callApi } from '../api';
import { GET_SCENARIOS } from '../../backend/routes/api-interfaces';

//// Interfaces

import { Scenario } from '../../backend/db/models';

//// User State Actions

export enum Actions {
    // LS_ prefix means Lobby State
    SCENARIOS_LOADING = 'LS_LOAD',
    SCENARIOS_LOADED = 'LS_SL',
    SCENARIOS_FAILED_TO_LOAD = 'LS_SFTL',
}

interface ScenariosLoadingAction { type: Actions.SCENARIOS_LOADING; }
interface ScenariosFailedToLoadAction { type: Actions.SCENARIOS_FAILED_TO_LOAD; }

interface ScenariosLoadedAction {
    type: Actions.SCENARIOS_LOADED;
    scenarios: Scenario[];
}

export type LobbyStateActionsType = (
    ScenariosLoadingAction|
    ScenariosLoadedAction|
    ScenariosFailedToLoadAction
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
