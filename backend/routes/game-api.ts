/**
 * Routes for interacting with the game itself
 */
import * as express from 'express';

import {config} from '../config';
import {BorisDatabase} from '../db/db';
import { START_GAME, ABANDON_GAME, GET_UI_STATE, GameStatus } from '../../common/api';
import { makeApiHelper, RequireUser, SafeError } from './api-utils';
import { Scenario } from '../../common/models';
import { GameManager } from '../game/manager';
import { publishEvent } from '../websocket/pub-sub';
import { NotificationType } from '../../common/notifications';

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
    const team = await db.teams.findOne({id: activeTeamMembership.team_id});
    const teamMembers = +await db.team_members.count({team_id: team.id, is_active: true});
    if (teamMembers < 2) {
        throw new SafeError("You must have at least two people on your team to play.");
    } else if (teamMembers > 5) {
        throw new SafeError("Too many people on the team."); // This shouldn't be possible.
    }
    const scenario = await db.scenarios.findOne({id: data.scenarioId, is_active: true});
    if (scenario === null) {
        throw new SafeError("Invalid scenario.");
    }
    // Start the game!
    try {
        await db.games.insert({
            team_id: team.id,
            scenario_id: scenario.id,
            is_active: true,
        });
    } catch (error) {
        throw new SafeError("Unable to start playing. Did the game already start?");
    }
    const gameStatus: GameStatus = {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        isActive: true,
    };
    publishEvent(team.id, {type: NotificationType.GAME_STATUS_CHANGED, ...gameStatus});
    return gameStatus;
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
