import 'jest';
import { TEST_SCENARIO_ID, createTeam } from '../test-lib/test-data';
import { BorisDatabase, getDB } from '../db/db';
import { GameVar, GameVarScope } from "./vars";
import { GameManager } from './manager';
import { getTeamVar } from './team-vars';

const teamVarNumber: GameVar<number> = {key: 'teamVarNumber', scope: GameVarScope.Team, default: 10};
const gameVarNumber: GameVar<number> = {key: 'gameVarNumber', scope: GameVarScope.Game, default: 15};
const stepVarString: GameVar<string> = {key: 'stepVarNumber', scope: GameVarScope.Step, default: ""};

describe("GameManager tests", () => {
    let db: BorisDatabase;
    let teamId: number;
    let userId1: number;
    let gameManager: GameManager;
    beforeAll(async () => { db = await getDB(); });
    afterAll(async () => { await db.instance.$pool.end(); });
    beforeEach(async () => {
        const data = await createTeam(db, 3);
        teamId = data.teamId;
        userId1 = data.user1.id;
        const testContext = {db, publishEventToUsers: () => {}};
        gameManager = (await GameManager.startGame(teamId, TEST_SCENARIO_ID, testContext)).manager;
    });
    afterEach(async () => {
        if (gameManager.gameActive) {
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
                expect(gameManager.gameActive).toBe(false);
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
    });

});
