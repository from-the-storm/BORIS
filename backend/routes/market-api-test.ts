import 'jest';
import { TestClient, TestServer, TestUserData } from '../test-lib/utils';
import { CREATE_TEAM, JOIN_TEAM, CreateOrJoinTeamResponse, LEAVE_TEAM, GET_SALTINES_BALANCE, GET_TEAM_MARKET_VARS } from '../../common/api';

describe("Game API tests", () => {
    let server: TestServer;
    let client1: TestClient, client2: TestClient;
    let user1: TestUserData, user2: TestUserData;
    let team: CreateOrJoinTeamResponse;
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
    describe("GET_SALTINES_BALANCE", async () => {

        it("Requires the user to be on a team", async () => {
            await client1.callApi(LEAVE_TEAM, {});
            await client1.callApiExpectError(GET_SALTINES_BALANCE, {}, "You are not on a team, so cannot do this.");
        });

        it("Returns zeroes for a new team", async () => {
            const status = await client1.callApi(GET_SALTINES_BALANCE, {});
            expect(status.saltinesBalance).toBe(0);
            expect(status.saltinesEarnedAllTime).toBe(0);
        });

    });

    describe("GET_TEAM_MARKET_VARS", async () => {

        it("Requires the user to be on a team", async () => {
            await client1.callApi(LEAVE_TEAM, {});
            await client1.callApiExpectError(GET_TEAM_MARKET_VARS, {}, "You are not on a team, so cannot do this.");
        });

        it("Returns the expected state for a new team", async () => {
            const status = await client1.callApi(GET_TEAM_MARKET_VARS, {});
            expect(status.forceMarket).toBe(false);
            expect(status.playerIsTheBurdened).toBe(false);
            expect(status.scenariosComplete).toBe(0);
        });

        // The rest of this is best tested via integration tests.

    });
});
