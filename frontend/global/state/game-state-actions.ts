import { Dispatch } from 'redux';
import { callApi } from '../../api';
import { START_GAME, GameDetailedStatus, ABANDON_GAME, GET_UI_STATE, GetUiStateResponse } from '../../../common/api';
import { AnyAction } from '../actions';
import { MessagesStateActions } from './messages-state-actions';
import { AnyUiState } from '../../../common/game';
import { RootState } from '../state';
import { GameState } from './game-state';

//// Game State Actions

export enum GameStateActions {
    // G_GS prefix means Global Game State
    GAME_STATUS_CHANGED = 'G_GS_STATUS_CHANGED', // Started, Completed, or Abandoned the current game
    ABANDON_GAME = 'G_GS_ABANDON_GAME', // Aborted a game without finishing it
    REVIEW_COMPLETE = 'G_GS_REVIEW_DONE', // The user has exited the game review.
    SET_UI_STATE = 'G_GS_SET_UI_STATE', // Refresh the entire game UI state
    UPDATE_STEP_UI_STATE = 'G_GS_UPDATE_STEP_UI_STATE', // Refresh the UI state of just one step
}
const Actions = GameStateActions;

interface GameStatusChangedAction {
    type: GameStateActions.GAME_STATUS_CHANGED;
    newStatus: GameDetailedStatus;
}

interface AbandonGameAction {
    type: GameStateActions.ABANDON_GAME;
}

interface ReviewCompleteAction {
    type: GameStateActions.REVIEW_COMPLETE;
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
    |GameStatusChangedAction
    |AbandonGameAction
    |ReviewCompleteAction
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
            type: Actions.GAME_STATUS_CHANGED,
            newStatus: result,
        });
    };
}

export function refreshGameUiState() {
    return async (dispatch: Dispatch<{}>, getState: () => RootState) => {
        let result: GetUiStateResponse;
        try {
            const activeGameId = getState().gameState.gameId;
            result = await callApi(GET_UI_STATE, activeGameId !== null ? {gameId: String(activeGameId)} : {});
        } catch(err) {
            dispatch<AnyAction>({
                type: MessagesStateActions.SHOW_ERROR,
                title: "Unable to load the game data.",
                errorHtml: err.message,
            });
            console.error(err);
            return;
        }
        // Update the game status if applicable:
        dispatch<GameStateActionsType>({
            type: Actions.GAME_STATUS_CHANGED,
            newStatus: result.gameStatus,
        });
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

export function doneReviewingGame() {
    return async (dispatch: Dispatch<{}>, getState: () => {}) => {
        dispatch<GameStateActionsType>({ type: Actions.REVIEW_COMPLETE });
    };
}
