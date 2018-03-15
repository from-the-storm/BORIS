/**
 * Routes for logging in, user registration, etc.
 */
import * as express from 'express';

import '../express-extended';
import {config} from '../config';
import {BorisDatabase} from '../db/db';
import { InitialStateResponse, GET_INITIAL_STATE } from './api-interfaces';
import { makeApiHelper, RequireUser } from './api-utils';

export const router = express.Router();

const getApiMethod = makeApiHelper(router, /^\/api\/app/, RequireUser.UserOptional);

/**
 * API endpoint for getting data needed to initialize the app's state:
 */
getApiMethod(GET_INITIAL_STATE, async (data, app, user) => {
    const db: BorisDatabase = app.get("db");
    const result: InitialStateResponse = {};
    if (user) {
        result.user = {
            first_name: user.first_name,
        };
        const activeTeamMembership = await db.team_members.findOne({user_id: user.id, is_active: true});
        if (activeTeamMembership !== null) {
            const team = await db.teams.findOne({id: activeTeamMembership.id});
            result.team = {
                code: team.code,
                name: team.name,
                isTeamAdmin: activeTeamMembership.is_admin,
                otherTeamMembers: [],
            };
        }
    }
    return result;
});
