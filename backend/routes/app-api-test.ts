import 'jest';
import { TestClient, TestServer } from '../test-lib/utils';
import { GET_INITIAL_STATE, CREATE_TEAM, JOIN_TEAM } from '../../common/api';

describe("App API tests", () => {
    describe("getOtherTeamMembers", async () => {
        it("isn't yet tested", () => {
            // TODO
        });
    });
    describe("getInitialState", async () => {
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
            expect(result.user).toEqual({first_name: "Jamie"});
            expect(result.team).toBeUndefined();
        });
        it("Returns user info when a user is logged and on a team", async () => {
            const userInfo = await client.registerAndLogin();
            await client.callApi(CREATE_TEAM, { teamName: "Test Team", organizationName: ""});
            const result = await client.callApi(GET_INITIAL_STATE, {});
            expect(result.user).toEqual({first_name: "Jamie"});
            expect(result.team.name).toEqual("Test Team");
            expect(result.team.code).toHaveLength(5);
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
            await client2.registerAndLogin();
            await client2.callApi(JOIN_TEAM, {code: teamInfo.teamCode});
            // Now, the original user gets the initial state:
            const result = await client.callApi(GET_INITIAL_STATE, {});
            expect(result.user).toEqual({first_name: "Jamie"});
            expect(result.team.name).toEqual("Test Team");
            expect(result.team.code).toHaveLength(5);
            expect(result.team.isTeamAdmin).toBe(true);
            expect(result.team.otherTeamMembers).toHaveLength(1);
            const user2id = result.team.otherTeamMembers[0].id;
            expect(typeof user2id).toEqual("number");
            expect(result.team.otherTeamMembers[0]).toEqual(
                {
                    name: "Jamie",
                    id: user2id,
                    online: false, // TODO: implement
                    isAdmin: false,
                }
            );
        });
    });
});
