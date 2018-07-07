import 'jest';
import { TestClient, TestServer, TestUserData } from '../test-lib/utils';
import { BorisDatabase } from '../db/db';
import { LIST_USERS, LIST_TEAMS, LIST_SCENARIOS, LIST_GAMES, LIST_SCRIPTS, CREATE_SCRIPT, EDIT_SCRIPT, GET_SCRIPT, GET_SCENARIO } from './admin-api';
import { ApiMethod } from '../../common/api';
import { createTeam, TEST_SCENARIO_ID } from '../test-lib/test-data';

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

    const checkSecurity = <A, B>(apiMethod: ApiMethod<A, B>, args: A = {} as A) => {
        it("Cannot be called by a regular user", async () => {
            const call = clientRegularUser.callApi(apiMethod, args);
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
        describe("Get Scenario (GET /api/admin/scenarios/:id)", async () => {

            checkSecurity(GET_SCENARIO, {id: "1"});

            it("Returns scenario data", async () => {
                const response = await client.callApi(GET_SCENARIO, {id: String(TEST_SCENARIO_ID)});
                expect(response).toEqual({
                    id: 123,
                    name: "Test Scenario",
                    is_active: true,
                    description_html: "<p>This route (approximately 700m) starts in front of Science World and follows the Seawall to the plaza area in front of Craft Beer Market.</p>",
                    difficulty: 'easy',
                    duration_min: 30,
                    script: "test-script",
                    start_point: {lat: 49.273373, lng: -123.102657},
                    start_point_name: "SE False Creek",
                });
            });

        });
    });

    describe("Scripts", async () => {

        const EXISTING_SCRIPT_ID = 'test-script2';

        const MINIMAL_SCRIPT = `---\n- step: message\n  messages:\n  - Hello`; // A short (valid!) example script we can use in tests.

        describe("List Scripts (GET /api/admin/scripts)", async () => {

            checkSecurity(LIST_SCRIPTS);

            it("Lists the scripts loaded as test fixtures", async () => {
                // See backend/db/schema/test-data.sql for where these scripts are defined.
                const response = await client.callApi(LIST_SCRIPTS, {});
                expect(response.count).toBeGreaterThanOrEqual(3);
                for (const scriptName of ['test-script', 'test-script2', 'test-roles-script']) {
                    expect(response.data).toContainEqual({name: scriptName});
                }
            });

        });
        describe("Get Script (GET /api/admin/scripts/:id)", async () => {

            checkSecurity(GET_SCRIPT, {id: 'test-script'});

            it("Gives a 404 when trying to load a non-existent script", async () => {
                const promise = client.callApi(GET_SCRIPT, {id: "foobar"});
                await expect(promise).rejects.toHaveProperty('statusCode', 404);
                await expect(promise).rejects.toHaveProperty('response.body', JSON.stringify({error: "Script \"foobar\" not found." }));
            });

            it("Can load a script", async () => {
                const response = await client.callApi(GET_SCRIPT, {id: 'test-script2'});
                expect(response).toEqual({
                    name: 'test-script2',
                    script_yaml: '---\n- step: message\n  messages:\n  - Hello! This is a message from the second script file.\n',
                });
            });

        });
        describe("Create Script (POST /api/admin/scripts)", async () => {

            checkSecurity(CREATE_SCRIPT);

            it("Gives a 400 error when trying to overwrite an existing script", async () => {
                await client.callApi(GET_SCRIPT, {id: EXISTING_SCRIPT_ID}); // Verify that the script exists; this will throw if not.
                const promise = client.callApi(CREATE_SCRIPT, {name: EXISTING_SCRIPT_ID, script_yaml: MINIMAL_SCRIPT});
                await expect(promise).rejects.toHaveProperty('statusCode', 400);
                await expect(promise).rejects.toHaveProperty('response.body', {
                    error: "Unable to save script \"test-script2\". Does a script with that name already exist?"
                });
            });

            it("Gives a 400 error when trying to create a script with invalid YAML", async () => {
                const promise = client.callApi(CREATE_SCRIPT, {name: 'new-script900', script_yaml: 'yeehaw!'});
                await expect(promise).rejects.toHaveProperty('statusCode', 400);
                await expect(promise).rejects.toHaveProperty('response.body', {error: "Script new-script900 format is invalid." });
            });

            it("Can create a new script", async () => {
                const newScriptId = 'new-script15';
                await expect(client.callApi(GET_SCRIPT, {id: newScriptId})).rejects.toHaveProperty('statusCode', 404);
                // Create the script:
                const createResponse = await client.callApi(CREATE_SCRIPT, {name: newScriptId, script_yaml: MINIMAL_SCRIPT});
                expect(createResponse.name).toEqual(newScriptId);
                const result = await client.callApi(GET_SCRIPT, {id: newScriptId});
                expect(result.name).toEqual(newScriptId);
                expect(result.script_yaml).toEqual(MINIMAL_SCRIPT);
            });

        });
        describe("Update Script (PUT /api/admin/scripts/:id)", async () => {

            checkSecurity(EDIT_SCRIPT, {id: 'test-script'});

            it("Gives a 400 error when trying to update a script with invalid YAML", async () => {
                await client.callApi(GET_SCRIPT, {id: EXISTING_SCRIPT_ID}); // Verify that the script exists; this will throw if not.
                const promise = client.callApi(EDIT_SCRIPT, {id: EXISTING_SCRIPT_ID, script_yaml: 'yeehaw!'});
                await expect(promise).rejects.toHaveProperty('statusCode', 400);
                await expect(promise).rejects.toHaveProperty('response.body', {error: `Script ${EXISTING_SCRIPT_ID} format is invalid.` });
            });

            it("Can edit an existing script", async () => {
                const oldYaml = (await client.callApi(GET_SCRIPT, {id: EXISTING_SCRIPT_ID})).script_yaml;
                expect(oldYaml).not.toEqual(MINIMAL_SCRIPT);
                const response = await client.callApi(EDIT_SCRIPT, {id: EXISTING_SCRIPT_ID, script_yaml: MINIMAL_SCRIPT});
                expect(response).toEqual({
                    name: EXISTING_SCRIPT_ID,
                    script_yaml: MINIMAL_SCRIPT,
                });
                const newYaml = (await client.callApi(GET_SCRIPT, {id: EXISTING_SCRIPT_ID})).script_yaml;
                expect(newYaml).toEqual(MINIMAL_SCRIPT);
            });

        });
    });

    describe("Games", async () => {
        describe("List Games (GET /api/admin/games)", async () => {

            checkSecurity(LIST_GAMES);

        });
    });
});
