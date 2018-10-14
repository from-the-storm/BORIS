import 'jest';
import { TEST_SCENARIO_ID, createTeam } from '../test-lib/test-data';
import { BorisDatabase, getDB } from '../db/db';
import { GameVar, GameVarScope } from "./vars";
import { GameManager } from './manager';
import { GameStatus } from './manager-defs';
import { getTeamVar } from './team-vars';

const teamVarNumber: GameVar<number> = {key: 'teamVarNumber', scope: GameVarScope.Team, default: 10};
const teamVarAny: GameVar<any> = {key: 'teamVarAny', scope: GameVarScope.Team, default: null};
const gameVarNumber: GameVar<number> = {key: 'gameVarNumber', scope: GameVarScope.Game, default: 15};
const gameVarAny: GameVar<any> = {key: 'gameVarAny', scope: GameVarScope.Game, default: null};
const stepVarString: GameVar<string> = {key: 'stepVarNumber', scope: GameVarScope.Step, default: ""};

describe("GameManager tests", () => {
    let db: BorisDatabase;
    let teamId: number;
    let userId1: number;
    beforeAll(async () => { db = await getDB(); });
    afterAll(async () => { await db.instance.$pool.end(); });
    beforeEach(async () => {
        const data = await createTeam(db, 3);
        teamId = data.teamId;
        userId1 = data.user1.id;
    });

    describe("using the Test Scenario", () => {
        let gameManager: GameManager;
        beforeEach(async () => {
            const testContext = {db, publishEventToUsers: () => {}};
            gameManager = (await GameManager.startGame(teamId, TEST_SCENARIO_ID, testContext)).manager;
        });
        afterEach(async () => {
            if (gameManager.status === GameStatus.InProgress) {
                await gameManager.abandon();
            }
        });

        describe("GameVars", () => {

            describe("Team Scope", () => {

                it("Returns the default value when it hasn't been set", async () => {
                    expect(gameManager.getVar(teamVarNumber)).toEqual(teamVarNumber.default);
                });

                it("Returns the new value when it gets set", async () => {
                    const setResult = await gameManager.setVar(teamVarNumber, val => 42);
                    expect(setResult).toEqual(42);
                    expect(gameManager.getVar(teamVarNumber)).toEqual(42);
                    await gameManager.setVar(teamVarNumber, val => ++val);
                    expect(gameManager.getVar(teamVarNumber)).toEqual(43);
                });

                it("Can store null values", async () => {
                    expect(gameManager.getVar(teamVarAny)).toBe(null); // Since null is the default
                    await gameManager.setVar(teamVarAny, val => 42);
                    expect(gameManager.getVar(teamVarAny)).toEqual(42);
                    const setResult = await gameManager.setVar(teamVarAny, val => null);
                    expect(setResult).toBe(null);
                    expect(gameManager.getVar(teamVarAny)).toBe(null);
                });

                it("Does not permanently affect the team vars if the game is abandoned", async() => {
                    expect(await getTeamVar(teamVarNumber, teamId, db)).toEqual(10); // Default value
                    await gameManager.setVar(teamVarNumber, val => 42);
                    expect(await getTeamVar(teamVarNumber, teamId, db)).toEqual(42);
                    await gameManager.abandon();
                    expect(await getTeamVar(teamVarNumber, teamId, db)).toEqual(10);
                });

                it("Permanently affects the team vars if the game completes successfully", async() => {
                    expect(await getTeamVar(teamVarNumber, teamId, db)).toEqual(10); // Default value
                    await gameManager.setVar(teamVarNumber, val => 42);
                    expect(await getTeamVar(teamVarNumber, teamId, db)).toEqual(42);
                    // Finish the test game:
                    await gameManager.allPendingStepsFlushed();
                    const lastStepId = Array.from(gameManager.steps.keys()).pop();
                    await gameManager.callStepHandler({stepId: lastStepId, choiceId: 'x'});
                    await gameManager.allPendingStepsFlushed();
                    expect(gameManager.status).toBe(GameStatus.InReview);
                    //////
                    expect(await getTeamVar(teamVarNumber, teamId, db)).toEqual(42);
                    // Note: the new value '42' will affect any subsequent test cases here.
                });

            });

            describe("Game Scope", () => {

                it("Returns the default value when it hasn't been set", async () => {
                    expect(gameManager.getVar(gameVarNumber)).toEqual(gameVarNumber.default);
                });

                it("Returns the new value when it gets set", async () => {
                    const setResult = await gameManager.setVar(gameVarNumber, val => 42);
                    expect(setResult).toEqual(42);
                    expect(gameManager.getVar(gameVarNumber)).toEqual(42);
                    await gameManager.setVar(gameVarNumber, val => ++val);
                    expect(gameManager.getVar(gameVarNumber)).toEqual(43);
                });

                it("Can store null values", async () => {
                    expect(gameManager.getVar(gameVarAny)).toBe(null); // Since null is the default
                    await gameManager.setVar(gameVarAny, val => 42);
                    expect(gameManager.getVar(gameVarAny)).toEqual(42);
                    const setResult = await gameManager.setVar(gameVarAny, val => null);
                    expect(setResult).toBe(null);
                    expect(gameManager.getVar(gameVarAny)).toBe(null);
                });

            });

            describe("Step Scope", () => {

                it("Returns the default value when it hasn't been set", async () => {
                    expect(gameManager.getVar(stepVarString, 1)).toEqual(stepVarString.default);
                });

                it("Is scoped to a step ID", async () => {
                    const setResult = await gameManager.setVar(stepVarString, val => "Bob", 1);
                    expect(setResult).toEqual("Bob");
                    await gameManager.setVar(stepVarString, val => "Axe", 5);
                    expect(gameManager.getVar(stepVarString, 1)).toEqual("Bob");
                    expect(gameManager.getVar(stepVarString, 2)).toEqual("");
                    expect(gameManager.getVar(stepVarString, 5)).toEqual("Axe");
                });

            });

            describe("In JS Expressions", () => {
                it("Gets 'undefined' when requesting a variable that's not set", () => {
                    expect(gameManager.safeEvalScriptExpression("VAR('foobar')", userId1)).toBe(undefined);
                });
                it("Can do conditionals on team vars", async () => {
                    await gameManager.setVar(teamVarNumber, val => 123456);
                    expect(gameManager.safeEvalScriptExpression("VAR('teamVarNumber') === 123456", userId1)).toBe(true);
                    expect(gameManager.safeEvalScriptExpression("VAR('teamVarNumber') === 567890", userId1)).toBe(false);
                    expect(gameManager.safeEvalScriptExpression("VAR('teamVarNumber') > 120000", userId1)).toBe(true);
                    expect(gameManager.safeEvalScriptExpression("VAR('teamVarNumber') > 567890", userId1)).toBe(false);
                });
                it("Can do conditionals on game vars", async () => {
                    await gameManager.setVar(gameVarNumber, val => 500);
                    expect(gameManager.safeEvalScriptExpression("VAR('gameVarNumber') === 500", userId1)).toBe(true);
                    expect(gameManager.safeEvalScriptExpression("VAR('gameVarNumber') === 200", userId1)).toBe(false);
                    expect(gameManager.safeEvalScriptExpression("VAR('gameVarNumber') > 250", userId1)).toBe(true);
                    expect(gameManager.safeEvalScriptExpression("VAR('gameVarNumber') > 600", userId1)).toBe(false);
                });
            });

        });

        describe("safeEvalScriptExpression", () => {
            it("Can do basic calculations", () => {
                expect(gameManager.safeEvalScriptExpression("1 + 1", userId1)).toBe(2);
                expect(gameManager.safeEvalScriptExpression("true === true", userId1)).toBe(true);
                expect(gameManager.safeEvalScriptExpression("'hello' === 'goobye'", userId1)).toBe(false);
            });
            it("Can access player survey data using USER_INFO()", () => {
                expect(gameManager.safeEvalScriptExpression("USER_INFO().survey_data.q1", userId1)).toEqual('a1');
            });
        });

        describe("getElapsedTime()", () => {
            it("is being tested on a computer whose clock is in sync with the DB's clock", async () => {
                const dbResults = await db.query('SELECT NOW() as nowdate', [], {});
                const dbDate = dbResults[0].nowdate;
                const nowDate = new Date();
                expect(+nowDate - +dbDate).toBeLessThan(3000);
                expect(+nowDate - +dbDate).toBeGreaterThan(-3000);
            });
            it("Returns a value that seems reasonable", async () => {
                await new Promise (r => setTimeout(r, 1000));
                const origTime = gameManager.getElapsedTime();
                expect(origTime).toBeGreaterThanOrEqual(1.0);
                expect(origTime).toBeLessThan(30);
                await new Promise (r => setTimeout(r, 1000));
                const newTime = gameManager.getElapsedTime();
                expect(newTime - origTime).toBeGreaterThanOrEqual(1.0);
                expect(newTime - origTime).toBeLessThan(10.0);
            });
        });
    });

    describe("abandon() tests", () => {
        it("Does not get 'stuck' if scripts run long", async () => {
            const testContext = {db, publishEventToUsers: () => {}};

            // Create a script that pauses for 200 seconds, and a scenario
            // that uses it.
            const longRunningScript = await db.scripts.insert({
                name: "long-running-script",
                script_yaml: `- step: pause\n  for: 200\n- step: pause\n  for: 0\n  if: "while (1) {}"`,
            });
            const longRunningScenario = await db.scenarios.insert({
                name: "Long Running Scenario",
                is_active: true,
                script: longRunningScript.name,
            });
            const gameManager = (await GameManager.startGame(teamId, longRunningScenario.id, testContext)).manager;

            await gameManager.abandon();
        });
    });
});
