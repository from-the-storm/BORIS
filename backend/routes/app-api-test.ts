import 'jest';
import { TestClient, TestServer } from '../test-lib/utils';
import { GET_INITIAL_STATE } from '../../common/api';

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
            expect(result.team).toBeUndefined();
            expect(result.user).toEqual({first_name: "Jamie"});
        });
    });
});
