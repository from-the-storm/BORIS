/**
 * Routes for logging in, user registration, etc.
 */
import * as express from 'express';

import '../express-extended';
import {config} from '../config';
import {BorisDatabase} from '../db/db';
import { InitialStateResponse, GET_INITIAL_STATE } from '../../common/api';
import { makeApiHelper, RequireUser } from './api-utils';
import { OtherTeamMember } from '../../common/models';

export const router = express.Router();

const getApiMethod = makeApiHelper(router, /^\/api\/app/, RequireUser.UserOptional);


/**
 * Helper method for getting a list of other team members
 */
async function getOtherTeamMembers(db: BorisDatabase, forUserId: number): Promise<OtherTeamMember[]> {
    const queryResult = await db.query(
        `SELECT * FROM team_members tm, users u
         WHERE tm.team_id = (SELECT team_id FROM team_members WHERE user_id = $1 AND is_active = 'true')
         AND is_active = 'true' AND tm.user_id != $1 AND u.id = tm.user_id`,
        [forUserId], {}
    );
    const result: OtherTeamMember[] = [];
    for (let row of queryResult) {
        result.push({
            name: row.first_name,
            id: row.user_id,
            online: false,
            isAdmin: row.is_admin,
        });
    }
    return result;
}

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
            const team = await db.teams.findOne({id: activeTeamMembership.team_id});
            result.team = {
                code: team.code,
                name: team.name,
                isTeamAdmin: activeTeamMembership.is_admin,
                otherTeamMembers: await getOtherTeamMembers(db, user.id),
            };
        }
    }
    return result;
});
