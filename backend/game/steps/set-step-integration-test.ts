import 'jest';
import { BorisDatabase, getDB } from '../../db/db';
import { GameManager } from '../manager';
import { GameStatus } from '../manager-defs';
import { createTeam } from '../../test-lib/test-data';
import { DBScenario } from '../../db/models';
import { AnyNotification, NotificationType } from '../../../common/notifications';
import { AnyUiState, StepType } from '../../../common/game';

describe("Set Variable Step Integration tests", () => {
    let db: BorisDatabase;
    let scenario: DBScenario;
    let testContext: {db: BorisDatabase, publishEventToUsers: (userIds: number[], event: AnyNotification) => void};
    let messageQueue: {userId: number, stepIndex: number, stepUi: AnyUiState}[];
    beforeAll(async () => {
        db = await getDB();
        scenario = (await db.scenarios.insert({
            is_active: true,
            name: "Test Scenario",
            script: 'test-set-var-script',
        }));
    });
    afterAll(async () => {
        await db.instance.$pool.end();
        });
    beforeEach(async () => {
        messageQueue = [];
        testContext = {
            db: db,
            publishEventToUsers: (userIds: number[], event: AnyNotification) => {
                if (event.type === NotificationType.GAME_UI_UPDATE) {
                    for (const userId of userIds) {
                        messageQueue.push({userId, stepIndex: event.stepIndex, stepUi: event.newStepUi});
                    }
                }
            },
        }
    });
    afterEach(async () => {
    });

    it("Updates variables as expected", async () =>{
        const {teamId} = await createTeam(db, 3);
        const {manager} = await GameManager.startGame(teamId, scenario.id, testContext);
        // Play through the whole script - there's no interaction in this test script.
        await manager.allPendingStepsFlushed();

        const expectMessage = (msg: any, expected: string[]) => {
            expect(msg.stepUi.type === StepType.MessageStep);
            expect(msg.stepUi.messages).toEqual(expected);
        }

        expectMessage(messageQueue[0], ["You have played this scenario 0 times"]);
        expect(manager.status).toBe(GameStatus.InReview);

        messageQueue = [];
        const manager2 = (await GameManager.startGame(teamId, scenario.id, testContext)).manager;
        await manager2.allPendingStepsFlushed();
        expectMessage(messageQueue[0], ["You have played this scenario 1 times"]);
        expect(manager2.status).toBe(GameStatus.InReview);
    }, 5000);
});
