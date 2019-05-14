import 'jest';
import { TestClient, TestServer } from '../test-lib/utils';
import { GET_INITIAL_STATE, CREATE_TEAM, JOIN_TEAM } from '../../common/api';

describe("App API tests", () => {
    describe("getInitialState", () => {
        let client: TestClient;
        let server: TestServer;
        beforeAll(async () => {
            server = new TestServer();
            await server.ready();
        });
        beforeEach(async () => {
            client = new TestClient(server);
        });
        afterAll(async () => {
            await server.close();
        });
        it("Returns the same thing for users who aren't logged in", async () => {
            const result = await client.callApi(GET_INITIAL_STATE, {});
            expect(result.team).toBeUndefined();
            expect(result.user).toBeUndefined();
        });
        it("Returns user info when a user is logged in", async () => {
            const userInfo = await client.registerAndLogin();
            const result = await client.callApi(GET_INITIAL_STATE, {});
            expect(result.user).toEqual({first_name: "Jamie", id: userInfo.id});
            expect(result.team).toBeUndefined();
        });
        it("Returns user info when a user is logged and on a team", async () => {
            const userInfo = await client.registerAndLogin();
            await client.callApi(CREATE_TEAM, { teamName: "Test Team", organizationName: ""});
            const result = await client.callApi(GET_INITIAL_STATE, {});
            expect(result.user).toEqual({first_name: "Jamie", id: userInfo.id});
            expect(result.team.teamName).toEqual("Test Team");
            expect(result.team.teamCode).toHaveLength(5);
            expect(result.team.isTeamAdmin).toBe(true);
            expect(result.team.otherTeamMembers).toEqual([]);
        });
        it("Returns user info when a user is logged and on a team", async () => {
            // Create one user and create a team:
            const userInfo = await client.registerAndLogin();
            const teamInfo = await client.callApi(CREATE_TEAM, { teamName: "Test Team", organizationName: ""});
            expect(teamInfo.teamCode).toHaveLength(5);
            // Create a second user and join the team
            const client2 = new TestClient(server);
            const user2info = await client2.registerAndLogin();
            await client2.callApi(JOIN_TEAM, {code: teamInfo.teamCode});
            // Now, the original user gets the initial state:
            const result = await client.callApi(GET_INITIAL_STATE, {});
            expect(result.user).toEqual({first_name: "Jamie", id: userInfo.id});
            expect(result.team.teamName).toEqual("Test Team");
            expect(result.team.teamCode).toHaveLength(5);
            expect(result.team.isTeamAdmin).toBe(true);
            expect(result.team.otherTeamMembers).toHaveLength(1);
            expect(result.team.otherTeamMembers[0]).toEqual(
                {
                    name: "Jamie",
                    id: user2info.id,
                    online: false,
                    isAdmin: false,
                }
            );
        });
        it("Returns the online status of other users", async () => {
            // Create one user and create a team:
            const userInfo = await client.registerAndLogin();
            const teamInfo = await client.callApi(CREATE_TEAM, { teamName: "Test Team", organizationName: ""});
            // Create a second user and join the team:
            const client2 = new TestClient(server);
            await client2.registerAndLogin();
            await client2.callApi(JOIN_TEAM, {code: teamInfo.teamCode});
            // Now, the original user gets the initial state, and it will say the second user is not yet online:
            const result = await client.callApi(GET_INITIAL_STATE, {});
            expect(result.team.otherTeamMembers).toHaveLength(1);
            expect(result.team.otherTeamMembers[0].online).toEqual(false);
            // Now the second user comes online:
            const rpcClient = await client2.openWebsocket();
            const result2 = await client.callApi(GET_INITIAL_STATE, {});
            expect(result2.team.otherTeamMembers).toHaveLength(1);
            expect(result2.team.otherTeamMembers[0].online).toEqual(true);
            await rpcClient.close();
        });
    });
});
