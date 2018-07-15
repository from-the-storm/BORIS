/**
 * Routes for interacting with the market
 */
import * as express from 'express';

import { BorisDatabase } from '../db/db';
import { GET_SALTINES_BALANCE } from '../../common/api';
import { makeApiHelper, RequireUser, SafeError } from './api-utils';
import { getSaltinesStatus } from '../game/steps/award-saltines';

export const router = express.Router();

const apiMethod = makeApiHelper(router, /^\/api\/market/, RequireUser.Required);

async function requireActiveTeamMembership(db: BorisDatabase, userId: number) {
    const activeTeamMembership = await db.team_members.findOne({user_id: userId, is_active: true});
    if (activeTeamMembership === null) {
        throw new SafeError("You are not on a team, so cannot do this.");
    }
    return activeTeamMembership;
}

/**
 * API endpoint for getting the user's team's saltines balance
 */
apiMethod(GET_SALTINES_BALANCE, async (data, app, user) => {
    const db: BorisDatabase = app.get("db");
    const activeTeamMembership = await requireActiveTeamMembership(db, user.id);
    const status = await getSaltinesStatus(activeTeamMembership.team_id, db);
    return {
        saltinesBalance: status.balance,
        saltinesEarnedAllTime: status.earned,
    };
});
