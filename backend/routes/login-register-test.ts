import 'jest';
import { TestClient, TestServer } from '../test-lib/utils';
import { CREATE_TEAM, GET_INITIAL_STATE, JOIN_TEAM, CreateOrJoinTeamResponse } from '../../common/api';

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
    //CREATE_TEAM
    describe("JOIN_TEAM", async () => {
        let teamInfo: CreateOrJoinTeamResponse;
        beforeAll(async () => {
            // Create a team for use in testing:
            const adminClient = new TestClient(server);
            await adminClient.registerAndLogin();
            teamInfo = await adminClient.callApi(CREATE_TEAM, { teamName: "Test Team", organizationName: "TestOrg"});
        });
        const getTeamData = async () => { return (await client.callApi(GET_INITIAL_STATE, {})).team; }

        it("Allows joining a team by code", async () => {
            const userInfo = await client.registerAndLogin();
            expect(await getTeamData()).toBeUndefined();
            // Join a team:
            await client.callApi(JOIN_TEAM, {code: teamInfo.teamCode});
            const joinedTeamData = await getTeamData();
            expect(joinedTeamData).not.toBeUndefined();
            expect(joinedTeamData.code).toEqual(teamInfo.teamCode);
            expect(joinedTeamData.isTeamAdmin).toEqual(false);
            expect(joinedTeamData.name).toEqual(teamInfo.teamName);
        });

        it("Is not case sensitive when joining a team by code", async () => {
            const userInfo = await client.registerAndLogin();
            expect(await getTeamData()).toBeUndefined();
            // Join a team:
            await client.callApi(JOIN_TEAM, {code: teamInfo.teamCode.toLocaleLowerCase()});
            const joinedTeamData = await getTeamData();
            expect(joinedTeamData).not.toBeUndefined();
            expect(joinedTeamData.code).toEqual(teamInfo.teamCode);
        });
    });
});
