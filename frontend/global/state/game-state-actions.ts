import { Dispatch } from 'redux';
import { callApi } from '../../api';
import { START_GAME, StartGameResponse, ABANDON_GAME, GET_UI_STATE, GetUiStateResponse } from '../../../common/api';
import { AnyAction } from '../actions';
import { MessagesStateActions } from './messages-state-actions';
import { AnyUiState } from '../../../common/game';

//// Game State Actions

export enum GameStateActions {
    // G_GS prefix means Global Game State
    START_GAME = 'G_GS_START_GAME', // Started a game
    ABANDON_GAME = 'G_GS_ABANDON_GAME', // Aborted a game without finishing it
    SET_UI_STATE = 'G_GS_SET_UI_STATE', // Refresh the entire game UI state
}
const Actions = GameStateActions;

interface StartGameAction {
    type: GameStateActions.START_GAME;
    scenarioId: number;
    scenarioName: string;
}

interface AbandonGameAction {
    type: GameStateActions.ABANDON_GAME;
}

interface SetUiStateAction {
    type: GameStateActions.SET_UI_STATE;
    state: AnyUiState[];
    updateSequence: number;
}

export type GameStateActionsType = StartGameAction|AbandonGameAction|SetUiStateAction;

//// Action Creators

export function startGame(scenarioId: number) {
    return async (dispatch: Dispatch<{}>, getState: () => {}) => {
        let result: StartGameResponse;
        try {
            result = await callApi(START_GAME, {scenarioId,});
        } catch(err) {
            dispatch<AnyAction>({
                type: MessagesStateActions.SHOW_ERROR,
                title: "Unable to start game",
                errorHtml: err.message,
            });
            console.error(err);
            return;
        }
        dispatch<GameStateActionsType>({
            type: Actions.START_GAME,
            scenarioId: result.scenarioId,
            scenarioName: result.scenarioName,
        });
        dispatch(refreshGameUiState());
    };
}

export function refreshGameUiState() {
    return async (dispatch: Dispatch<{}>, getState: () => {}) => {
        let result: GetUiStateResponse;
        try {
            result = await callApi(GET_UI_STATE, {});
        } catch(err) {
            dispatch<AnyAction>({
                type: MessagesStateActions.SHOW_ERROR,
                title: "Unable to load the game data.",
                errorHtml: err.message,
            });
            console.error(err);
            return;
        }
        dispatch<GameStateActionsType>({
            type: Actions.SET_UI_STATE,
            state: result.state,
            updateSequence: result.updateSequence,
        });
    };
}

export function abandonGame() {
    return async (dispatch: Dispatch<{}>, getState: () => {}) => {
        await callApi(ABANDON_GAME, {});
        dispatch<GameStateActionsType>({ type: Actions.ABANDON_GAME });
    };
}
