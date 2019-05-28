import 'jest';
import { TestClient, TestServer, TestUserData } from '../test-lib/utils';
import { BorisDatabase } from '../db/db';
import {
    LIST_USERS,
    LIST_TEAMS,
    LIST_SCENARIOS,
    LIST_GAMES,
    LIST_SCRIPTS,
    CREATE_SCRIPT,
    EDIT_SCRIPT,
    GET_SCRIPT,
    GET_SCENARIO,
    CREATE_SCENARIO,
    EDIT_SCENARIO,
    GET_TEAM,
    RESET_TEAM_VARS,
    SANITIZE_TEAM_NAME,
    GET_USER,
    DELETE_TEAM,
    DELETE_SCENARIO,
    DELETE_SCRIPT,
} from './admin-api';
import { ApiMethod } from '../../common/api';
import { createTeam, TEST_SCENARIO_ID } from '../test-lib/test-data';

describe("Admin API tests", () => {
    let server: TestServer;
    let client: TestClient;
    let clientRegularUser: TestClient;
    let adminUser: TestUserData;
    let regularUser: TestUserData;
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
        regularUser = await clientRegularUser.registerAndLogin();
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


    describe("Users", () => {
        describe("List Users (GET /api/admin/users)", () => {

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

        describe("Get User (GET /api/admin/users/:id)", () => {

            checkSecurity(GET_USER);

            it("Returns information about a user", async () => {
                const userInfo = await client.callApi(GET_USER, {id: String(regularUser.id)});
                expect(userInfo.id).toBe(regularUser.id);
                expect(userInfo.first_name).toBe(regularUser.firstName);
                expect(userInfo.survey_data.age).toBe(regularUser.age);
                expect(userInfo.survey_data.gender).toBe(regularUser.gender);
                expect(userInfo.survey_data.occupation).toBe(regularUser.occupation);
            });
        });
    });

    describe("Teams", () => {
        describe("List Teams (GET /api/admin/teams)", () => {

            checkSecurity(LIST_TEAMS);

        });
        describe("Team Details (GET /api/admin/teams/:id)", () => {

            checkSecurity(GET_TEAM, {id: "1"});

            it("Returns team data", async () => {
                const {team, teamId, user1, user2, user3} = await createTeam(server.app.get("db") as BorisDatabase, 3);
                const response = await client.callApi(GET_TEAM, {id: String(teamId)});
                expect(response).toEqual({
                    id: teamId,
                    name: team.name,
                    organization: team.organization,
                    code: team.code,
                    created: JSON.stringify(team.created).replace(/"/g, ''),
                    members: [
                        {user_id: user1.id, first_name: user1.first_name, email: user1.email},
                        {user_id: user2.id, first_name: user2.first_name, email: user2.email},
                        {user_id: user3.id, first_name: user3.first_name, email: user3.email},
                    ],
                    game_vars: team.game_vars,
                });
            });

        });
        describe("Team Var Reset (POST /api/admin/teams/:id/reset)", () => {

            checkSecurity(RESET_TEAM_VARS, {id: "1"});

        });
        describe("Team Name and Organization Sanitizing (POST /api/admin/teams/:id/sanitize-team-name)", () => {

            checkSecurity(SANITIZE_TEAM_NAME, {id: "1"});

        });
        describe("Delete Team (DELETE /api/admin/teams/:id)", () => {

            checkSecurity(DELETE_TEAM, {id: "1"});

        });
    });

    describe("Scenarios", () => {
        describe("List Scenarios (GET /api/admin/scenarios)", () => {

            checkSecurity(LIST_SCENARIOS);

        });
        describe("Get Scenario (GET /api/admin/scenarios/:id)", () => {

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
                    city: 'vancouver',
                    order: 100,
                });
            });
        });

        describe("Create Scenario (POST /api/admin/scenarios)", () => {

            checkSecurity(CREATE_SCENARIO);

            it("Can create a new scenario", async () => {
                // Create the scenario:
                const createResponse = await client.callApi(CREATE_SCENARIO, {
                    name: "A New Test Scenario",
                    is_active: false,
                    start_point: {lat: 15.2, lng: 35.15},
                    start_point_name: 'a place',
                    script: 'test-script',
                    city: 'vancouver',
                    order: 15,
                });
                expect(typeof createResponse.id).toBe('number');
                expect(createResponse.name).toEqual("A New Test Scenario");
                expect(createResponse.is_active).toBe(false);
                expect(createResponse.start_point).toEqual({lat: 15.2, lng: 35.15});
                const result = await client.callApi(GET_SCENARIO, {id: String(createResponse.id)});
                expect(result).toEqual(createResponse);
            });

        });
        describe("Update Scenario (PUT /api/admin/scenarios/:id)", () => {

            checkSecurity(EDIT_SCENARIO, {id: String(TEST_SCENARIO_ID)});

            it("Can edit an existing scenario", async () => {
                const createResponse = await client.callApi(CREATE_SCENARIO, {
                    name: "A New Test Scenario",
                    script: 'test-script',
                    is_active: false,
                    start_point: {lat: 15.2, lng: 35.15},
                    description_html: 'test description',
                    city: 'vancouver',
                    order: 50,
                });
                expect(createResponse.is_active).toBe(false);
                const updateResponse = await client.callApi(EDIT_SCENARIO, {
                    id: String(createResponse.id),
                    name: "A Modified Test Scenario",
                    is_active: true,
                    start_point: {lat: 18.2, lng: 15.15},
                    city: 'kelowna',
                    // We don't specify a script nor description_html which should leave it unchanged.
                });
                expect(updateResponse.id).toEqual(createResponse.id);
                expect(updateResponse.name).toEqual("A Modified Test Scenario");
                expect(updateResponse.is_active).toBe(true);
                expect(updateResponse.start_point).toEqual({lat: 18.2, lng: 15.15});
                expect(updateResponse.city).toEqual('kelowna');
                expect(updateResponse.script).toEqual('test-script');
                expect(updateResponse.description_html).toEqual('test description');
                expect(updateResponse.order).toEqual(50);
                const getResponse = await client.callApi(GET_SCENARIO, {id: String(createResponse.id)});
                expect(getResponse).toEqual(updateResponse);
            });
        });
        describe("Delete Scenario (DELETE /api/admin/scenarios/:id)", () => {

            checkSecurity(DELETE_SCENARIO, {id: "1"});

            it("Can delete a scenario", async () => {
                // Create the scenario:
                const createResponse = await client.callApi(CREATE_SCENARIO, {
                    name: "A New Test Scenario",
                    is_active: false,
                    start_point: {lat: 15.2, lng: 35.15},
                    start_point_name: 'a place',
                    script: 'test-script',
                    city: 'vancouver',
                    order: 500,
                });
                await client.callApi(DELETE_SCENARIO, {id: String(createResponse.id)});
                const promise = client.callApi(GET_SCENARIO, {id: String(createResponse.id)});
                await expect(promise).rejects.toHaveProperty('statusCode', 404);
            });

        });
    });

    describe("Scripts", () => {

        const EXISTING_SCRIPT_ID = 'test-script2';

        const MINIMAL_SCRIPT = `---\n- step: message\n  messages:\n  - Hello`; // A short (valid!) example script we can use in tests.

        describe("List Scripts (GET /api/admin/scripts)", () => {

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
        describe("Get Script (GET /api/admin/scripts/:id)", () => {

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
                    script_yaml: '---\n- step: choice\n  key: chooseXtoEndGame\n  choices:\n    - x: Done\n',
                });
            });

        });
        describe("Create Script (POST /api/admin/scripts)", () => {

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
        describe("Update Script (PUT /api/admin/scripts/:id)", () => {

            checkSecurity(EDIT_SCRIPT, {id: 'test-script'});

            it("Gives a 400 error when trying to update a script with invalid YAML", async () => {
                await client.callApi(GET_SCRIPT, {id: EXISTING_SCRIPT_ID}); // Verify that the script exists; this will throw if not.
                const promise = client.callApi(EDIT_SCRIPT, {id: EXISTING_SCRIPT_ID, script_yaml: 'yeehaw!'});
                await expect(promise).rejects.toHaveProperty('statusCode', 400);
                await expect(promise).rejects.toHaveProperty('response.body', {error: `Script ${EXISTING_SCRIPT_ID} format is invalid.` });
            });

            it("Can edit an existing script", async () => {
                const newScriptId = 'new-script35';
                await client.callApi(CREATE_SCRIPT, {name: newScriptId, script_yaml: '[]'});

                const oldYaml = (await client.callApi(GET_SCRIPT, {id: newScriptId})).script_yaml;
                expect(oldYaml).not.toEqual(MINIMAL_SCRIPT);
                const response = await client.callApi(EDIT_SCRIPT, {id: newScriptId, script_yaml: MINIMAL_SCRIPT});
                expect(response).toEqual({
                    name: newScriptId,
                    script_yaml: MINIMAL_SCRIPT,
                });
                const newYaml = (await client.callApi(GET_SCRIPT, {id: newScriptId})).script_yaml;
                expect(newYaml).toEqual(MINIMAL_SCRIPT);
            });

        });
        describe("Delete Script (DELETE /api/admin/scripts/:id)", () => {

            checkSecurity(DELETE_SCRIPT, {id: "script35"});

        });
    });

    describe("Games", () => {
        describe("List Games (GET /api/admin/games)", () => {

            checkSecurity(LIST_GAMES);

        });
    });
});
