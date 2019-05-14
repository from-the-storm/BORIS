import 'jest';
import { TestClient, TestServer, TestUserData } from '../test-lib/utils';
import { CREATE_TEAM, GET_INITIAL_STATE, JOIN_TEAM, TeamStatus, LEAVE_TEAM, KICK_OFF_TEAM } from '../../common/api';

describe("Login/registration API tests", () => {
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
    const getTeamData = async (_client = client) => { return (await _client.callApi(GET_INITIAL_STATE, {})).team; }

    //CREATE_TEAM
    describe("JOIN_TEAM", () => {
        let teamInfo: TeamStatus;
        beforeAll(async () => {
            // Create a team for use in testing:
            const adminClient = new TestClient(server);
            await adminClient.registerAndLogin();
            teamInfo = await adminClient.callApi(CREATE_TEAM, { teamName: "Test Team", organizationName: "TestOrg"});
        });

        it("Allows joining a team by code", async () => {
            const userInfo = await client.registerAndLogin();
            expect(await getTeamData()).toBeUndefined();
            // Join a team:
            await client.callApi(JOIN_TEAM, {code: teamInfo.teamCode});
            const joinedTeamData = await getTeamData();
            expect(joinedTeamData).not.toBeUndefined();
            expect(joinedTeamData.teamCode).toEqual(teamInfo.teamCode);
            expect(joinedTeamData.isTeamAdmin).toEqual(false);
            expect(joinedTeamData.teamName).toEqual(teamInfo.teamName);
        });

        it("Is not case sensitive when joining a team by code", async () => {
            const userInfo = await client.registerAndLogin();
            expect(await getTeamData()).toBeUndefined();
            // Join a team:
            await client.callApi(JOIN_TEAM, {code: teamInfo.teamCode.toLocaleLowerCase()});
            const joinedTeamData = await getTeamData();
            expect(joinedTeamData).not.toBeUndefined();
            expect(joinedTeamData.teamCode).toEqual(teamInfo.teamCode);
        });
    });

    describe("LEAVE_TEAM", () => {

        it("Allows leaving a team", async () => {
            const userInfo = await client.registerAndLogin();
            expect(await getTeamData()).toBeUndefined();
            // Join a team:
            const teamInfo = await client.callApi(CREATE_TEAM, { teamName: "Test Team", organizationName: "TestOrg"});
            await client.callApi(JOIN_TEAM, {code: teamInfo.teamCode});
            expect(await getTeamData()).not.toBeUndefined();
            // Leave the team:
            await client.callApi(LEAVE_TEAM, {});
            expect(await getTeamData()).toBeUndefined();
        });

    });
    describe("KICK_OFF_TEAM", () => {
        let teamInfo: TeamStatus;
        let adminClient: TestClient;
        let adminUserInfo: TestUserData;
        let userInfo: TestUserData;
        beforeEach(async () => {
            // Create a team for use in testing, with an admin and a normal user
            adminClient = new TestClient(server);
            adminUserInfo = await adminClient.registerAndLogin();
            teamInfo = await adminClient.callApi(CREATE_TEAM, { teamName: "Test Team", organizationName: "TestOrg"});
            userInfo = await client.registerAndLogin();
            await client.callApi(JOIN_TEAM, {code: teamInfo.teamCode});
        });

        it("The admin can kick the normal user off the team", async () => {
            // The user is on the team:
            expect(await getTeamData()).not.toBeUndefined();
            // The admin kicks them off:
            await adminClient.callApi(KICK_OFF_TEAM, { teamMemberId: userInfo.id });
            // The user is now off the team:
            expect(await getTeamData()).toBeUndefined();
        });

        it("The normal user cannot kick the admin off the team", async () => {
            // The admin user is on the team:
            expect(await getTeamData(adminClient)).not.toBeUndefined();
            // The admin kicks them off:
            expect(client.callApi(KICK_OFF_TEAM, { teamMemberId: adminUserInfo.id })).rejects.toHaveProperty('message', "403 - {\"error\":\"You are not a team admin\"}");
            // The admin user is still on the team:
            expect(await getTeamData(adminClient)).not.toBeUndefined();
        });

    });
});
