/**
 * Routes for interacting with the game itself
 */
import * as express from 'express';

import {config} from '../config';
import {BorisDatabase} from '../db/db';
import { START_GAME, ABANDON_GAME } from '../../common/api';
import { makeApiHelper, RequireUser, SafeError } from './api-utils';
import { Scenario } from '../../common/models';

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
    return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
    };
});

/**
 * API endpoint for ending the active scenario
 */
apiMethod(ABANDON_GAME, async (data, app, user) => {
    const db: BorisDatabase = app.get("db");
    const activeTeamMembership = await requireActiveTeamMembership(db, user.id);
    const game = await db.games.findOne({team_id: activeTeamMembership.team_id, is_active: true});
    if (game !== null) {
        await db.games.update({id: game.id}, {is_active: false}); // We leave 'finished' NULL to indicate this was abandoned, not completed.
    }
    return {result: 'ok'};
});
