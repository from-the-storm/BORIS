import 'jest';
import { TestClient, TestServer } from '../test-lib/utils';
import { GET_LEADERS } from '../../common/api';

describe("Lobby API tests", () => {
    let client: TestClient;
    let server: TestServer;
    beforeAll(async () => {
        server = new TestServer();
        await server.ready();
    });
    beforeEach(async () => {
        client = new TestClient(server);
        await client.registerAndLogin();
    });
    afterAll(async () => {
        await server.close();
    });

    describe("GET_LEADERS", () => {
        it("Runs without error", async () => {
            await client.callApi(GET_LEADERS, {});
        });
    });
});
