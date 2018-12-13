/**
 * Routes for interacting with the market
 */
import * as express from 'express';

import { BorisDatabase } from '../db/db';
import { GET_TEAM_MARKET_VARS, BUY_PUNCHCARD, MarketStatus } from '../../common/api';
import { makeApiHelper, RequireUser, SafeError } from './api-utils';
import { getSaltinesStatus, spendSaltines } from '../game/steps/award-saltines';
import { getUserIdWithRoleForTeam } from '../game/steps/assign-roles';
import { getTeamVar, setTeamVar } from '../game/team-vars';
import { GameVar, GameVarScope } from '../game/vars';
import { punchcards } from '../../common/market';
import { notifyTeamMarketStatusChanged } from '../websocket/team-changed';

export const router = express.Router();

export const activePunchcardVar: GameVar<string|null> = {key: 'active-punchcard', scope: GameVarScope.Team, default: null};

const apiMethod = makeApiHelper(router, /^\/api\/market/, RequireUser.Required);

async function requireActiveTeamMembership(db: BorisDatabase, userId: number) {
    const activeTeamMembership = await db.team_members.findOne({user_id: userId, is_active: true});
    if (activeTeamMembership === null) {
        throw new SafeError("You are not on a team, so cannot do this.");
    }
    return activeTeamMembership;
}

export async function getMarketStatus(teamId: number, userId: number, db: BorisDatabase): Promise<MarketStatus> {
    // Count how many scenarios this team has completed:
    const scenariosComplete = Number(await db.games.count({team_id: teamId, 'finished is not': null}));
    // Don't allow access to the market if no scenarios are completed, _or_ if the team already bought a punchcard.
    const aPunchcardIsActive = (await getTeamVar(activePunchcardVar, teamId, db)) !== null;
    // Check if the current user is "The Burdened" as of the last game:
    const theBurdenedUserId = await getUserIdWithRoleForTeam('B', teamId, db);
    const theBurdenedIsStillOnTheTeam = (
        theBurdenedUserId !== undefined &&
        (await db.team_members.findOne({team_id: teamId, user_id: theBurdenedUserId, is_active: true })) !== null
    );
    const playerIsTheBurdened = (theBurdenedUserId === userId) || !theBurdenedIsStillOnTheTeam; // In the rare case where the Burdened has left the team, treat all users as the Burdened
    let status = MarketStatus.Hidden;
    if (aPunchcardIsActive) {
        status = MarketStatus.AlreadyBought;
    } else if (scenariosComplete >= 1) {
        // The team has completed at least one scenario
        status = playerIsTheBurdened ? MarketStatus.Open : MarketStatus.Taped;
    }
    return status;
}

/**
 * API endpoint for getting the variables that affect when/how the market is seen
 */
apiMethod(GET_TEAM_MARKET_VARS, async (data, app, user) => {
    const db: BorisDatabase = app.get("db");
    const teamId = (await requireActiveTeamMembership(db, user.id)).team_id;
    const saltinesStatus = await getSaltinesStatus(teamId, db);
    return {
        saltinesBalance: saltinesStatus.balance,
        saltinesEarnedAllTime: saltinesStatus.earned,
        status: await getMarketStatus(teamId, user.id, db),
    }
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
        throw new SafeError("You don't have enough saltines for that!");
    }

    // Record this as the active punchcard:
    await setTeamVar(activePunchcardVar, () => punchcard.id, teamId, db);

    // Mark those saltines as spent:
    const statusAfter = await spendSaltines(punchcard.saltinesCost, teamId, db);

    // Push the result out to everyone on the team:
    await notifyTeamMarketStatusChanged(app, teamId);

    return {
        saltinesBalance: statusAfter.balance,
        saltinesEarnedAllTime: statusAfter.earned,
        status: await getMarketStatus(teamId, user.id, db),
    };
});
