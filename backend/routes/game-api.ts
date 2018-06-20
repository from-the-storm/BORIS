/**
 * Routes for interacting with the game itself
 */
import * as express from 'express';

import {BorisDatabase} from '../db/db';
import { START_GAME, ABANDON_GAME, GET_UI_STATE, STEP_RESPONSE } from '../../common/api';
import { makeApiHelper, RequireUser, SafeError } from './api-utils';
import { GameManager } from '../game/manager';

export const router = express.Router();

const apiMethod = makeApiHelper(router, /^\/api\/game/, RequireUser.Required);

async function requireActiveTeamMembership(db: BorisDatabase, userId: number) {
    const activeTeamMembership = await db.team_members.findOne({user_id: userId, is_active: true});
    if (activeTeamMembership === null) {
        throw new SafeError("You are not on a team, so cannot do this.");
    }
    return activeTeamMembership;
}

const noActiveGame = Symbol();

/**
 * Since any user may only be playing one game at a time, this gets
 * the active game being played by any user, or returns noActiveGame
 * if that user isn't currently playing any game.
 * @param db The BorisDatabase
 * @param userId The ID of the user whose active game you want
 */
async function getActiveGameForUser(app: express.Application, userId: number): Promise<GameManager|typeof noActiveGame> {
    const db: BorisDatabase = app.get('db');
    const activeTeamMembership = await requireActiveTeamMembership(db, userId);
    const game = await db.games.findOne({team_id: activeTeamMembership.team_id, is_active: true});
    if (game === null) {
        return noActiveGame;
    }
    return await GameManager.loadGame(game.id);
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
    const gameManager = await getActiveGameForUser(app, user.id);
    if (gameManager !== noActiveGame) {
        await gameManager.abandon();
    }
    return {result: 'ok'};
});

apiMethod(GET_UI_STATE, async (data, app, user) => {
    const gameManager = await getActiveGameForUser(app, user.id);
    if (gameManager === noActiveGame) {
        throw new SafeError("No game is currently active.");
    }
    return {
        uiUpdateSeqId: gameManager.uiUpdateSeqId,
        state: gameManager.getUiState(),
    };
});

/**
 * A player is submitting some kind of response to a "step" in the script.
 * For example, selecitng a choice from a multiple choice prompt.
 */
apiMethod(STEP_RESPONSE, async (data, app, user) => {
    const gameManager = await getActiveGameForUser(app, user.id);
    if (gameManager === noActiveGame) {
        throw new SafeError("No game is currently active.");
    }
    await gameManager.callStepHandler(data);
    return {result: 'ok'};
});
