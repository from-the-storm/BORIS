import 'jest';
import { TestClient, TestServer, TestUserData } from '../test-lib/utils';
import { GET_INITIAL_STATE, CREATE_TEAM, JOIN_TEAM, CreateOrJoinTeamResponse, LEAVE_TEAM, START_GAME, ABANDON_GAME } from '../../common/api';

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
    describe("START_GAME", async () => {

        it("Requires the user to be on a team", async () => {
            await client1.callApi(LEAVE_TEAM, {});
            const call = client1.callApi(START_GAME, {scenarioId: scenarioId});
            await expect(call).rejects.toHaveProperty('statusCode', 400);
            await expect(call).rejects.toHaveProperty('response.body.error', "You are not on a team, so cannot do this.");
        });

        it("Throws an error if there aren't enough people on the team", async () => {
            await client2.callApi(LEAVE_TEAM, {});
            expect((await client1.callApi(GET_INITIAL_STATE, {})).team.otherTeamMembers).toHaveLength(0);
            // User1 is now the only user on the team, and tries to start a game by themself:
            const call = client1.callApi(START_GAME, {scenarioId: scenarioId});
            await expect(call).rejects.toHaveProperty('statusCode', 400);
            await expect(call).rejects.toHaveProperty('response.body.error', "You must have at least two people on your team to play.");
        });

        it("Throws an error if the scenario ID is invalid", async () => {
            const call = client1.callApi(START_GAME, {scenarioId: 328947298375});
            await expect(call).rejects.toHaveProperty('statusCode', 400);
            await expect(call).rejects.toHaveProperty('response.body.error', "Invalid scenario.");
        });

        it("Throws an error if starting a game twice", async () => {
            const firstCall = client1.callApi(START_GAME, {scenarioId,});
            await expect(firstCall).resolves.toHaveProperty('scenarioId', scenarioId);
            const secondCall = client1.callApi(START_GAME, {scenarioId,});
            await expect(secondCall).rejects.toHaveProperty('statusCode', 400);
            await expect(secondCall).rejects.toHaveProperty('response.body.error', "Unable to start playing. Did the game already start?");
        });

        it("Starts the game", async () => {
            // First, verify that a game has not started:
            expect((await client1.callApi(GET_INITIAL_STATE, {})).game).toBeUndefined();
            // Start the game:
            await client1.callApi(START_GAME, {scenarioId,});
            // Now the game should have started for all users on the team:
            const user1state = (await client1.callApi(GET_INITIAL_STATE, {}));
            expect(user1state.game).not.toBeUndefined();
            expect(user1state.game.scenarioId).toEqual(scenarioId);
            const user2state = (await client1.callApi(GET_INITIAL_STATE, {}));
            expect(user2state.game).not.toBeUndefined();
            expect(user2state.game.scenarioId).toEqual(scenarioId);
        });

    });

    describe("ABANDON_GAME", async () => {

        it("Requires the user to be on a team", async () => {
            await client1.callApi(LEAVE_TEAM, {});
            const call = client1.callApi(ABANDON_GAME, {});
            await expect(call).rejects.toHaveProperty('statusCode', 400);
            await expect(call).rejects.toHaveProperty('response.body.error', "You are not on a team, so cannot do this.");
        });

        it("Is a no-op if no game has started", async () => {
            // First, verify that a game has not started:
            expect((await client1.callApi(GET_INITIAL_STATE, {})).game).toBeUndefined();
            // Try abandoning the non-existent game:
            const result = await client1.callApi(ABANDON_GAME, {});
            expect(result.result).toEqual('ok');
        });

        it("Will abandon the game in progress for all users", async () => {
            // Start the game:
            await client1.callApi(START_GAME, {scenarioId,});
            // Abandon the game:
            const result = await client1.callApi(ABANDON_GAME, {});
            expect(result.result).toEqual('ok');
            // First, verify that the game has stopped for all users:
            expect((await client1.callApi(GET_INITIAL_STATE, {})).game).toBeUndefined();
            expect((await client2.callApi(GET_INITIAL_STATE, {})).game).toBeUndefined();
        });

    });
});
