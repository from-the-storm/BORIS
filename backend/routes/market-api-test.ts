import 'jest';
import { TestClient, TestServer, TestUserData } from '../test-lib/utils';
import { CREATE_TEAM, JOIN_TEAM, TeamStatus, LEAVE_TEAM, GET_TEAM_MARKET_VARS, BUY_PUNCHCARD, MarketStatus } from '../../common/api';
import { punchcards } from '../../common/market';
import { getTeamVar, setTeamVar } from '../game/team-vars';
import { getDB } from '../db/db';
import { activePunchcardVar } from './market-api';
import { getSaltinesStatus, SALTINES_EARNED_ALL_TIME } from '../game/steps/award-saltines';

describe("Game API tests", () => {
    let server: TestServer;
    let client1: TestClient, client2: TestClient;
    let user1: TestUserData, user2: TestUserData;
    let team: TeamStatus;
    const scenarioId = 123; // Defined in 'db/schema/test-data.sql' fixture file
    beforeAll(async () => {
        server = new TestServer();
        await server.ready();
    });
    beforeEach(async () => {
        // Create two users that are on the same team, for testing the game APIs:
        client1 = new TestClient(server);
        client2 = new TestClient(server);
        [user1, user2] = await Promise.all([client1.registerAndLogin(), client2.registerAndLogin()]);
        team = await client1.callApi(CREATE_TEAM, { teamName: "Test Team", organizationName: ""});
        await client2.callApi(JOIN_TEAM, {code: team.teamCode});
    });
    afterAll(async () => {
        await server.close();
    });

    describe("GET_TEAM_MARKET_VARS", () => {

        it("Requires the user to be on a team", async () => {
            await client1.callApi(LEAVE_TEAM, {});
            await client1.callApiExpectError(GET_TEAM_MARKET_VARS, {}, "You are not on a team, so cannot do this.");
        });

        it("Returns the expected state for a new team", async () => {
            const result = await client1.callApi(GET_TEAM_MARKET_VARS, {});
            expect(result.status).toBe(MarketStatus.Hidden);
            expect(result.saltinesBalance).toBe(0);
            expect(result.saltinesEarnedAllTime).toBe(0);
        });

        // The rest of this is best tested via integration tests.

    });

    describe("BUY_PUNCHCARD", () => {

        it("Requires the user to be on a team", async () => {
            await client1.callApi(LEAVE_TEAM, {});
            await client1.callApiExpectError(BUY_PUNCHCARD, {}, "You are not on a team, so cannot do this.");
        });

        const punchcard = punchcards[0];

        it("Does not allow a team with no saltines to buy", async () => {
            await client1.callApiExpectError(BUY_PUNCHCARD, {punchcardId: punchcard.id}, "You don't have enough saltines for that!");
        });

        it("Allows purchasing a card", async () => {
            expect(punchcard.saltinesCost).toBeGreaterThan(0);
            const db = await getDB();
            const teamId = (await db.teams.findOne({code: team.teamCode})).id;
            expect(await getTeamVar(activePunchcardVar, teamId, db)).toBe(null);
            await setTeamVar(SALTINES_EARNED_ALL_TIME, v => v+100, teamId, db);
            expect((await getSaltinesStatus(teamId, db)).balance).toBe(100);

            // Purchase a card:
            const result = await client1.callApi(BUY_PUNCHCARD, {punchcardId: punchcard.id});

            // Check the results:
            const status = await getSaltinesStatus(teamId, db);
            expect(status.balance).toBe(100 - punchcard.saltinesCost);
            expect(result.saltinesBalance).toBe(100 - punchcard.saltinesCost);
            expect(result.saltinesEarnedAllTime).toBe(status.earned);
            expect(result.status).toBe(MarketStatus.AlreadyBought);

            // And the punchcard should be active:
            expect(await getTeamVar(activePunchcardVar, teamId, db)).toBe(punchcard.id);
        });

    });
});
