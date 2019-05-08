/**
 * Routes for logging in, user registration, etc.
 */
import * as express from 'express';

import {config} from '../config';
import {BorisDatabase} from '../db/db';
import { GET_SCENARIOS, GET_LEADERS, LeaderboardEntry } from '../../common/api';
import { makeApiHelper, RequireUser } from './api-utils';
import { Scenario } from '../../common/models';
import { scenarioFromDbScenario } from '../db/models';

export const router = express.Router();

const apiMethod = makeApiHelper(router, /^\/api\/lobby/, RequireUser.Required);

/**
 * API endpoint for getting data about the available scenarios
 */
apiMethod(GET_SCENARIOS, async (data, app, user) => {
    const db: BorisDatabase = app.get("db");
    const scenarios = await db.scenarios.find(
        {is_active: true},
        {order: [{field: 'order'}, {field: 'name'}]} as any, // TODO: Fix massive.js type definitions 'order' field
    );
    const cleanedScenarios: Array<Scenario> = scenarios.map( scenarioFromDbScenario );
    return {scenarios: cleanedScenarios};
});

/**
 * API endpoint for getting data about the available scenarios
 */
apiMethod(GET_LEADERS, async (data, app, user) => {
    const db: BorisDatabase = app.get("db");
    const leaderData = await db.query(`
        SELECT name, organization, completed, CAST(t.game_vars->>'saltines' as integer) AS score FROM teams t
        INNER JOIN (
            SELECT team_id, COUNT(games.id) AS completed FROM games WHERE finished IS NOT NULL GROUP BY team_id
        ) g ON g.team_id = t.id
        WHERE t.game_vars->>'saltines' IS NOT NULL ORDER BY score DESC LIMIT 25;
    `, [], {});

    const leaders: LeaderboardEntry[] = [];
    let nextRank = 0;
    let lastScore = -1;
    for (const data of leaderData) {
        if (data.score != lastScore) {
            nextRank++;
        }
        leaders.push({
            teamName: data.name,
            organization: data.organization,
            scenariosCompleted: data.completed,
            score: data.score,
            rank: nextRank,
        })
    }

    return {
        leaders,
    };
});
