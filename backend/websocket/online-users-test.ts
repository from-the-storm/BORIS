import 'jest';
import { TestServer } from '../test-lib/utils';
import { setUserOnline, setUserOffline, isUserOnline } from './online-users';

describe("Redis tests", () => {
    let server: TestServer;
    beforeAll(async () => {
        server = new TestServer();
        await server.ready();
    });
    afterAll(async () => {
        await server.close();
    });
    describe("isUserOnline", () => {
        it("Returns false for a random user ID", async () => {
            expect(await isUserOnline(99999999)).toBe(false);
        });
        it("Returns true if a user is recently marked as online", async () => {
            const userId = 1500000;
            await setUserOnline(userId);
            expect(await isUserOnline(userId)).toBe(true);
        });
        it("Returns false if a user is recently marked as offline", async () => {
            const userId = 1500001;
            await setUserOnline(userId);
            await setUserOffline(userId);
            expect(await isUserOnline(userId)).toBe(false);
        });
    });
});
