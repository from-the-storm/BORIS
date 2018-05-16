/**
 * Routes for logging in, user registration, etc.
 */
import * as express from 'express';

import {config} from '../config';
import {BorisDatabase} from '../db/db';
import { GET_SCENARIOS } from '../../common/api';
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
    const scenarios = await db.scenarios.find({is_active: true});
    const cleanedScenarios: Array<Scenario> = scenarios.map( scenarioFromDbScenario );
    return {scenarios: cleanedScenarios};
});
