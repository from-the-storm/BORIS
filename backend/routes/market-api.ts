/**
 * Routes for interacting with the market
 */
import * as express from 'express';

import { BorisDatabase } from '../db/db';
import { GET_SALTINES_BALANCE, GET_TEAM_MARKET_VARS, BUY_PUNCHCARD } from '../../common/api';
import { makeApiHelper, RequireUser, SafeError } from './api-utils';
import { getSaltinesStatus, spendSaltines } from '../game/steps/award-saltines';
import { getUserIdWithRoleForTeam } from '../game/steps/assign-roles';
import { getTeamVar, setTeamVar } from '../game/team-vars';
import { GameVar, GameVarScope } from '../game/vars';
import { punchcards } from '../../common/market';

export const router = express.Router();

export const plotDeviceCounterVar: GameVar<number> = {key: 'plot-device', scope: GameVarScope.Team, default: 0};
export const activePunchcardVar: GameVar<string|null> = {key: 'active-punchcard', scope: GameVarScope.Team, default: null};

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

/**
 * API endpoint for getting the variables that affect when/how the market is seen
 */
apiMethod(GET_TEAM_MARKET_VARS, async (data, app, user) => {
    const db: BorisDatabase = app.get("db");
    const teamId = (await requireActiveTeamMembership(db, user.id)).team_id;
    // Count how many scenarios this team has completed:
    const scenariosComplete = Number(await db.games.count({team_id: teamId, 'finished is not': null}));
    // Don't allow access to the market if no scenarios are completed, _or_ if the team already bought a punchcard.
    const allowMarket = scenariosComplete > 0 && (await getTeamVar(activePunchcardVar, teamId, db)) === null;
    // Check if the current user is "The Burdened" as of the last game:
    const theBurdenedUserId = await getUserIdWithRoleForTeam('B', teamId, db);
    const playerIsTheBurdened = (theBurdenedUserId === user.id);
    // Do we force the Burdened to enter the market?
    const plotDeviceCounter = await getTeamVar(plotDeviceCounterVar, teamId, db);
    const theBurdenedIsStillOnTheTeam = (
        theBurdenedUserId !== undefined &&
        (await db.team_members.findOne({team_id: teamId, user_id: theBurdenedUserId, is_active: true })) !== null
    );
    const forceMarket = scenariosComplete > 0 && plotDeviceCounter === 0 && theBurdenedIsStillOnTheTeam;
    return { scenariosComplete, playerIsTheBurdened, allowMarket, forceMarket };
});


/**
 * API endpoint for purchasing a punchcard
 */
apiMethod(BUY_PUNCHCARD, async (data, app, user) => {
    const db: BorisDatabase = app.get("db");
    const teamId = (await requireActiveTeamMembership(db, user.id)).team_id;
    const status = await getSaltinesStatus(teamId, db);

    const punchcard = punchcards.find(pc => pc.id === data.punchcardId);
    if (punchcard === undefined) {
        throw new SafeError("Invalid punchcard");
    }

    if (status.balance < punchcard.saltinesCost) {
        throw new SafeError("Insufficient saltines balance for that purchase.");
    }

    // If this is the first punchcard purchases, increase the plot device counter:
    if ((await getTeamVar(plotDeviceCounterVar, teamId, db)) === 0) {
        await setTeamVar(plotDeviceCounterVar, () => 1, teamId, db);
    }

    // Record this as the active punchcard:
    await setTeamVar(activePunchcardVar, () => punchcard.id, teamId, db);

    // Mark those saltines as spent:
    const statusAfter = await spendSaltines(punchcard.saltinesCost, teamId, db);

    return { saltinesBalance: statusAfter.balance, saltinesEarnedAllTime: statusAfter.earned, };
});
