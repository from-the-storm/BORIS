import 'jest';
import { TestClient, TestServer, TestUserData } from '../test-lib/utils';
import { BorisDatabase } from '../db/db';
import { LIST_USERS, LIST_TEAMS, LIST_SCENARIOS, LIST_GAMES, LIST_SCRIPTS, CREATE_SCRIPT } from './admin-api';
import { ApiMethod } from '../../common/api';
import { createTeam } from '../test-lib/test-data';

describe("Admin API tests", () => {
    let server: TestServer;
    let client: TestClient;
    let clientRegularUser: TestClient;
    let adminUser: TestUserData;
    beforeAll(async () => {
        server = new TestServer();
        await server.ready();
        const db = server.app.get("db") as BorisDatabase;
        client = new TestClient(server);
        clientRegularUser = new TestClient(server);
        // Create 20 teams and 100 users (10 per team):
        for (let i = 0; i < 20; i ++) {
            createTeam(db, 5);
        }
        // Create two more users: an admin user and a regular user
        adminUser = await client.registerAndLogin();
        await db.admin_users.insert({user_id: adminUser.id});
        await clientRegularUser.registerAndLogin();
    });
    beforeEach(async () => {
    });
    afterAll(async () => {
        await server.close();
    });

    const checkSecurity = <A, B>(apiMethod: ApiMethod<A, B>) => {
        it("Cannot be called by a regular user", async () => {
            const call = clientRegularUser.callApi(apiMethod, {});
            await expect(call).rejects.toHaveProperty('statusCode', 403);
            if (apiMethod.type === 'GET') {
                // TODO: Why does GET not decode the JSON body?
                await expect(call).rejects.toHaveProperty('response.body', JSON.stringify({error: "You are not an admin user." }));
            } else {
                await expect(call).rejects.toHaveProperty('response.body', {error: "You are not an admin user." });
            }
        });
    };


    describe("Users", async () => {
        describe("List Users (GET /api/admin/users)", async () => {

            checkSecurity(LIST_USERS);

            it("Returns a paginated list of all users", async () => {
                const firstPageResults = await client.callApi(LIST_USERS, {perPage: "10"});
                const totalUsers = firstPageResults.count
                expect(totalUsers).toBeGreaterThanOrEqual(100); // We can't know the exact number because other tests running in parallel may be creating users
                // And the default results should be paginated to 10 users per page:
                expect(firstPageResults.data.length).toBe(10);
                // Fetch all users:
                const allResults = await client.callApi(LIST_USERS, {perPage: String(totalUsers + 10)});
                expect(allResults.data.length).toBeGreaterThanOrEqual(totalUsers);
                // The admin user should be able to see themselves in the list of users:
                expect(allResults.data.find(u => u.email === adminUser.email)).not.toBeUndefined();
            });
        });
    });

    describe("Teams", async () => {
        describe("List Teams (GET /api/admin/teams)", async () => {

            checkSecurity(LIST_TEAMS);

        });
    });

    describe("Scenarios", async () => {
        describe("List Scenarios (GET /api/admin/scenarios)", async () => {

            checkSecurity(LIST_SCENARIOS);

        });
    });

    describe("Scripts", async () => {
        describe("List Scripts (GET /api/admin/scripts)", async () => {

            checkSecurity(LIST_SCRIPTS);

        });
        describe("Create Script (POST /api/admin/scripts)", async () => {

            checkSecurity(CREATE_SCRIPT);

        });
    });

    describe("Games", async () => {
        describe("List Games (GET /api/admin/games)", async () => {

            checkSecurity(LIST_GAMES);

        });
    });
});
