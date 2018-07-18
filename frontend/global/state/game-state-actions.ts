import { Dispatch } from 'redux';
import { callApi } from '../../api';
import { START_GAME, GameDetailedStatus, ABANDON_GAME, GET_UI_STATE, GetUiStateResponse } from '../../../common/api';
import { AnyAction } from '../actions';
import { MessagesStateActions } from './messages-state-actions';
import { AnyUiState } from '../../../common/game';
import { RootState } from '../state';

//// Game State Actions

export enum GameStateActions {
    // G_GS prefix means Global Game State
    START_GAME = 'G_GS_START_GAME', // Started a game
    ABANDON_GAME = 'G_GS_ABANDON_GAME', // Aborted a game without finishing it
    SET_UI_STATE = 'G_GS_SET_UI_STATE', // Refresh the entire game UI state
    UPDATE_STEP_UI_STATE = 'G_GS_UPDATE_STEP_UI_STATE', // Refresh the UI state of just one step
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
    uiUpdateSeqId: number;
}

interface UpdateStepUiStateAction {
    type: GameStateActions.UPDATE_STEP_UI_STATE;
    stepIndex: number;
    uiUpdateSeqId: number;
    state: AnyUiState;
}

export type GameStateActionsType = (
    |StartGameAction
    |AbandonGameAction
    |SetUiStateAction
    |UpdateStepUiStateAction
);

//// Action Creators

export function startGame(scenarioId: number) {
    return async (dispatch: Dispatch<{}>, getState: () => {}) => {
        let result: GameDetailedStatus;
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
    return async (dispatch: Dispatch<{}>, getState: () => RootState) => {
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
        if (getState().gameState.isActive && !result.gameStatus.isActive) {
            // A game was active but now that we check, it's not.
            dispatch<GameStateActionsType>({type: Actions.ABANDON_GAME});
            return;
        } else if (!getState().gameState.isActive && result.gameStatus.isActive) {
            // A game was not active but now that we check, it is.
            dispatch<GameStateActionsType>({
                type: GameStateActions.START_GAME,
                scenarioId: result.gameStatus.scenarioId,
                scenarioName: result.gameStatus.scenarioName,
            });
        }
        // And force the game UI to update:
        dispatch<GameStateActionsType>({
            type: Actions.SET_UI_STATE,
            state: result.state,
            uiUpdateSeqId: result.uiUpdateSeqId,
        });
    };
}

export function updateStepUiState(stepIndex: number, newState: AnyUiState, uiUpdateSeqId: number) {
    return async (dispatch: Dispatch<{}>, getState: () => RootState) => {
        if (uiUpdateSeqId === getState().gameState.uiUpdateSeqId + 1) {
            dispatch<AnyAction>({
                type: Actions.UPDATE_STEP_UI_STATE,
                stepIndex,
                uiUpdateSeqId: uiUpdateSeqId,
                state: newState,
            });
        } else {
            // We probably missed a notification, e.g. from being offline temporarily. Refresh the whole UI.
            console.error("Missed a UI update notification; doing a full refresh.");
            dispatch(refreshGameUiState());
        }
    };
}

export function abandonGame() {
    return async (dispatch: Dispatch<{}>, getState: () => {}) => {
        await callApi(ABANDON_GAME, {});
        dispatch<GameStateActionsType>({ type: Actions.ABANDON_GAME });
    };
}
