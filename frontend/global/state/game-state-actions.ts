import { Dispatch } from 'redux';
import { callApi } from '../../api';
import { START_GAME, StartGameResponse, ABANDON_GAME } from '../../../common/api';

//// Game State Actions

export enum GameStateActions {
    // G_GS prefix means Global Game State
    START_GAME = 'G_GS_START_GAME', // Started a game
    ABANDON_GAME = 'G_GS_ABANDON_GAME', // Aborted a game without finishing it
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

export type GameStateActionsType = StartGameAction|AbandonGameAction;

//// Action Creators

export function startGame(scenarioId: number) {
    return async (dispatch: Dispatch<{}>, getState: () => {}) => {
        let result: StartGameResponse;
        try {
            result = await callApi(START_GAME, {scenarioId,});
        } catch(err) {
            console.error(err);
            return;
        }
        dispatch<GameStateActionsType>({
            type: Actions.START_GAME,
            scenarioId: result.scenarioId,
            scenarioName: result.scenarioName,
        });
    };
}

export function abandonGame() {
    return async (dispatch: Dispatch<{}>, getState: () => {}) => {
        await callApi(ABANDON_GAME, {});
        dispatch<GameStateActionsType>({ type: Actions.ABANDON_GAME });
    };
}
