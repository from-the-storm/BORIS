import {Dispatch} from 'redux';

//// Interfaces

export interface Scenario {
    id: number;
    name: string;
}

//// User State Actions

export enum Actions {
    // LS_ prefix means Lobby State
    SCENARIOS_LOADED = 'LS_SL',
}

export interface ScenariosLoadedAction {
    type: Actions.SCENARIOS_LOADED,
    scenarios: Scenario[],
}

export type LobbyStateActionsType = ScenariosLoadedAction;

//// Action Creators

