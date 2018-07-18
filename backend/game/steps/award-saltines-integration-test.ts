import 'jest';
import { BorisDatabase, getDB } from '../../db/db';
import { GameManager } from '../manager';
import { GameStatus } from '../manager-defs';
import { createTeam } from '../../test-lib/test-data';
import { DBScenario } from '../../db/models';
import { AnyNotification } from '../../../common/notifications';
import { StepType } from '../../../common/game';
import { getSaltinesStatus, getSaltinesEarnedInGame } from './award-saltines';

async function sendXtoCurrentChoiceStep(manager: GameManager, userId = manager.playerIds[0]) {
    const stepsSeen = manager.getUiStateForUser(userId);
    const currentStep = stepsSeen[stepsSeen.length - 1];
    expect(currentStep.type).toEqual(StepType.MultipleChoice);
    await manager.callStepHandler({stepId: currentStep.stepId, choiceId: 'x'});
    await manager.allPendingStepsFlushed();
}

describe("Award Saltines Integration tests", () => {
    let db: BorisDatabase;
    let scenario: DBScenario;
    let testContext: {db: BorisDatabase, publishEventToUsers: (userIds: number[], event: AnyNotification) => void};
    let teamId: number; 
    beforeAll(async () => {
        db = await getDB();
        scenario = (await db.scenarios.insert({
            is_active: true,
            name: "Test Scenario",
            script: 'test-saltines-script',
        }));
        teamId = (await createTeam(db, 3)).teamId;
        testContext = {
            db: db,
            publishEventToUsers: (userIds: number[], event: AnyNotification) => {},
        }
    });
    afterAll(async () => {
        await db.instance.$pool.end();
    });

    it("Shows the team as having no saltines earned at first", async () => {
        expect(await getSaltinesStatus(teamId, db)).toEqual({
            earned: 0,
            spent: 0,
            balance: 0,
        });
    });

    it("Shows the team as having 5 of 10 saltines halfway through the game and 11 of 16 when done", async () => {
        const {manager, status} = await GameManager.startGame(teamId, scenario.id, testContext);
        await manager.allPendingStepsFlushed();
        expect(getSaltinesEarnedInGame(manager)).toEqual({
            earnedThisGame: 5,
            possibleThisGame: 10,
        });
        expect(await getSaltinesStatus(teamId, db)).toEqual({
            earned: 5,
            spent: 0,
            balance: 5,
        });
        await sendXtoCurrentChoiceStep(manager);
        expect(getSaltinesEarnedInGame(manager)).toEqual({
            earnedThisGame: 11,
            possibleThisGame: 16,
        });
        expect(await getSaltinesStatus(teamId, db)).toEqual({
            earned: 11,
            spent: 0,
            balance: 11,
        });
        expect(manager.status).toBe(GameStatus.InProgress);
        await sendXtoCurrentChoiceStep(manager);
        expect(manager.status).toBe(GameStatus.InReview);
        // The game is now complete:
        expect(getSaltinesEarnedInGame(manager)).toEqual({
            earnedThisGame: 11,
            possibleThisGame: 16,
        });
        expect(await getSaltinesStatus(teamId, db)).toEqual({
            earned: 11,
            spent: 0,
            balance: 11,
        });
    });

    it("Reverts the saltines awarded if the game is abandoned", async () => {
        expect(await getSaltinesStatus(teamId, db)).toEqual({
            earned: 11,
            spent: 0,
            balance: 11,
        });
        const {manager, status} = await GameManager.startGame(teamId, scenario.id, testContext);
        await manager.allPendingStepsFlushed();
        expect(getSaltinesEarnedInGame(manager)).toEqual({
            earnedThisGame: 5,
            possibleThisGame: 10,
        });
        expect(await getSaltinesStatus(teamId, db)).toEqual({
            earned: 11 + 5,
            spent: 0,
            balance: 11 + 5,
        });
        await manager.abandon();
        expect(await getSaltinesStatus(teamId, db)).toEqual({
            earned: 11,
            spent: 0,
            balance: 11,
        });
    });
});
