import 'jest';
import { TEST_SCENARIO_ID, TEST_TEAM_ID } from '../test-lib/test-data';
import { BorisDatabase, getDB } from '../db/db';
import { GameVar, GameVarScope } from "./vars";
import { GameManager } from './manager';
import { getTeamVar } from './team-vars';

const teamVarNumber: GameVar<number> = {key: 'teamVarNumber', scope: GameVarScope.Team, default: 10};
const gameVarNumber: GameVar<number> = {key: 'gameVarNumber', scope: GameVarScope.Game, default: 15};
const stepVarString: GameVar<string> = {key: 'stepVarNumber', scope: GameVarScope.Step, default: ""};

describe("GameManager tests", () => {
    let db: BorisDatabase;
    let gameId: number;
    let gameManager: GameManager;
    beforeAll(async () => { db = await getDB(); });
    afterAll(async () => { await db.instance.$pool.end(); });
    beforeEach(async () => {
        gameId = (await db.games.insert({
            team_id: TEST_TEAM_ID,
            scenario_id: TEST_SCENARIO_ID,
            is_active: true,
        })).id;
        const testContext = {db, publishEvent: () => {}};
        gameManager = await GameManager.loadGame(gameId, testContext);
    });
    afterEach(async () => {
        await db.games.update({id: gameId}, {is_active: false});
    });

    describe("finish()", async () => {
        it("throws an error if the game was abandoned.", async () => {
            await gameManager.abandon();
            await expect(gameManager.finish()).rejects.toHaveProperty('message', "Game was not active.");
        });
        it("throws an error if the game was completed.", async () => {
            await gameManager.finish();
            await expect(gameManager.finish()).rejects.toHaveProperty('message', "Game was not active.");
        });
    });

    describe("GameVars", async () => {

        describe("Team Scope", async () => {

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
                expect(await getTeamVar(teamVarNumber, TEST_TEAM_ID, db)).toEqual(10); // Default value
                await gameManager.setVar(teamVarNumber, val => 42);
                expect(await getTeamVar(teamVarNumber, TEST_TEAM_ID, db)).toEqual(42);
                await gameManager.abandon();
                expect(await getTeamVar(teamVarNumber, TEST_TEAM_ID, db)).toEqual(10);
            });

            it("Permanently affects the team vars if the game completes successfully", async() => {
                expect(await getTeamVar(teamVarNumber, TEST_TEAM_ID, db)).toEqual(10); // Default value
                await gameManager.setVar(teamVarNumber, val => 42);
                expect(await getTeamVar(teamVarNumber, TEST_TEAM_ID, db)).toEqual(42);
                await gameManager.finish();
                expect(await getTeamVar(teamVarNumber, TEST_TEAM_ID, db)).toEqual(42);
                // Note: the new value '42' will affect any subsequent test cases here.
            });

        });

        describe("Game Scope", async () => {

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

        describe("Step Scope", async () => {

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

    });

});