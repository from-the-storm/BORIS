import 'jest';
import { TestServer, TestClient } from '../test-lib/utils';
import { isUserOnline } from './online-users';

describe("Websocket connection tests", () => {
    let server: TestServer;
    beforeAll(async () => {
        server = new TestServer();
        await server.ready();
    });
    afterAll(async () => {
        await server.close();
    });
    describe("User online status", () => {
        it("Shows a user as online while their websocket is open", async () => {
            const client = new TestClient(server);
            const user = await client.registerAndLogin();

            expect(await isUserOnline(user.id)).toBe(false);

            const ws = await client.openWebsocket();

            expect(await isUserOnline(user.id)).toBe(true);

            await ws.close();
            // We have no way to properly wait for the server to process the close event, so do our best:
            await new Promise(r => setTimeout(r, 100));

            expect(await isUserOnline(user.id)).toBe(false);
        });

        it("Shows a user as online when they have multiple websockets open", async () => {
            const client1 = new TestClient(server);
            const client2 = new TestClient(server);
            const user = await client1.registerAndLogin();
            await client2.loginAs(user.email);

            expect(await isUserOnline(user.id)).toBe(false);

            const ws1 = await client1.openWebsocket();

            expect(await isUserOnline(user.id)).toBe(true);

            const ws2 = await client2.openWebsocket();

            // Allow the server to process any events:
            await new Promise(r => setTimeout(r, 100));

            expect(await isUserOnline(user.id)).toBe(true);
        
            // We close one websocket, but the user should still
            // be marked as online, since the second will stay open:
            await ws1.close();
            await new Promise(r => setTimeout(r, 100));

            expect(await isUserOnline(user.id)).toBe(true);

            await ws2.close();
            await new Promise(r => setTimeout(r, 100));

            expect(await isUserOnline(user.id)).toBe(false);
        });
    });
});
