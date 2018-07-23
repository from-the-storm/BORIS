/**
 * Routes for interacting with the game itself
 */
import * as express from 'express';

import {BorisDatabase} from '../db/db';
import { START_GAME, ABANDON_GAME, GET_UI_STATE, STEP_RESPONSE } from '../../common/api';
import { makeApiHelper, RequireUser, SafeError } from './api-utils';
import { GameManager } from '../game/manager';
import { GameStatus } from '../game/manager-defs';

export const router = express.Router();

const apiMethod = makeApiHelper(router, /^\/api\/game/, RequireUser.Required);

async function requireActiveTeamMembership(db: BorisDatabase, userId: number) {
    const activeTeamMembership = await db.team_members.findOne({user_id: userId, is_active: true});
    if (activeTeamMembership === null) {
        throw new SafeError("You are not on a team, so cannot do this.");
    }
    return activeTeamMembership;
}

/**
 * Since any user may only be playing one game at a time, this gets
 * the active game being played by any user, or returns noActiveGame
 * if that user isn't currently playing any game.
 * @param db The BorisDatabase
 * @param userId The ID of the user whose active game you want
 */
async function getActiveGameForUser(app: express.Application, userId: number): Promise<{active: boolean, gameManager?: GameManager, scenarioId?: number}> {
    const db: BorisDatabase = app.get('db');
    const activeTeamMembership = await requireActiveTeamMembership(db, userId);
    const game = await db.games.findOne({team_id: activeTeamMembership.team_id, is_active: true});
    if (game === null) {
        return {active: false};
    }
    return {
        active: true,
        gameManager: await GameManager.loadGame(game.id),
        scenarioId: game.scenario_id,
    };
}

/**
 * API endpoint for starting a new scenario
 */
apiMethod(START_GAME, async (data, app, user) => {
    const db: BorisDatabase = app.get("db");
    const activeTeamMembership = await requireActiveTeamMembership(db, user.id);
    let {status} = await GameManager.startGame(activeTeamMembership.team_id, data.scenarioId);
    return status;
});

/**
 * API endpoint for ending the active scenario
 */
apiMethod(ABANDON_GAME, async (data, app, user) => {
    const {active, gameManager} = await getActiveGameForUser(app, user.id);
    if (active) {
        await gameManager.abandon();
    }
    return {result: 'ok'};
});

/**
 * Get the UI state of the current game, if any.
 * Or, optionally, get the UI state of a particular game.
 */
apiMethod(GET_UI_STATE, async (data, app, user) => {
    const db: BorisDatabase = app.get("db");
    let gameManager: GameManager, scenarioId: number;
    if (data.gameId !== undefined) {
        const gameId = parseInt(data.gameId, 10);
        if (typeof gameId !== 'number') {
            throw new SafeError("Invalid gameId parameter");
        }
        gameManager = await GameManager.loadGame(gameId);
        if (gameManager.playerIds.indexOf(user.id) === -1) {
            throw new SafeError("You don't have permission to access that game.", 403);
        }
        scenarioId = (await db.games.findOne({id: gameId}, {columns: ['scenario_id']})).scenario_id;
    } else {
        // Load the active game only:
        const gameInfo = await getActiveGameForUser(app, user.id);
        gameManager = gameInfo.gameManager;
        scenarioId = gameInfo.scenarioId;
    }
    if (gameManager) {
        return {
            gameStatus: {
                gameId: gameManager.gameId,
                isActive: gameManager.status === GameStatus.InProgress,
                isFinished: gameManager.status === GameStatus.Complete,
                scenarioId: scenarioId,
                scenarioName: (await db.scenarios.findOne({id: scenarioId})).name,
            },
            uiUpdateSeqId: gameManager.lastUiUpdateSeqIdsByUserId[user.id],
            state: gameManager.getUiStateForUser(user.id),
        };
    }
    return {
        gameStatus: {
            gameId: null,
            isActive: false,
            isFinished: false,
            scenarioId: 0,
            scenarioName: '',
        },
        uiUpdateSeqId: 0,
        state: [],
    };
});

/**
 * A player is submitting some kind of response to a "step" in the script.
 * For example, selecitng a choice from a multiple choice prompt.
 */
apiMethod(STEP_RESPONSE, async (data, app, user) => {
    const {active, gameManager} = await getActiveGameForUser(app, user.id);
    if (!active) {
        throw new SafeError("No game is currently active.");
    }
    await gameManager.callStepHandler(data);
    return {result: 'ok'};
});
