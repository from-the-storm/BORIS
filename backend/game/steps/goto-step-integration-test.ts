import 'jest';
import { getUserIdWithRoleForTeam } from './assign-roles';
import { BorisDatabase, getDB } from '../../db/db';
import { GameManager } from '../manager';
import { GameStatus } from '../manager-defs';
import { createTeam } from '../../test-lib/test-data';
import { DBScenario } from '../../db/models';
import { AnyNotification, NotificationType } from '../../../common/notifications';
import { AnyUiState, StepType } from '../../../common/game';

describe("Goto Target Integration tests", () => {
    let db: BorisDatabase;
    let scenario: DBScenario;
    let testContext: {db: BorisDatabase, publishEventToUsers: (userIds: number[], event: AnyNotification) => void};
    let messageQueue: {userId: number, stepIndex: number, stepUi: AnyUiState}[];
    beforeAll(async () => {
        db = await getDB();
        scenario = (await db.scenarios.insert({
            is_active: true,
            name: "Test Scenario",
            script: 'test-goto-script',
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

    it("Sends the users through the script as expected", async () =>{
        const {teamId} = await createTeam(db, 3);
        const {manager} = await GameManager.startGame(teamId, scenario.id, testContext);
        // Play through the whole script - there's no interaction in this test script.
        await manager.allPendingStepsFlushed();
        const doomsayerUserId = await getUserIdWithRoleForTeam('D', teamId, db);
        const wayfinderUserId = await getUserIdWithRoleForTeam('W', teamId, db);
        const burdenedUserId = await getUserIdWithRoleForTeam('B', teamId, db);
        expect(doomsayerUserId).not.toEqual(wayfinderUserId);
        expect(wayfinderUserId).not.toEqual(burdenedUserId);
        const doomsayerMessages = messageQueue.filter(msg => msg.userId === doomsayerUserId);
        const wayfinderMessages = messageQueue.filter(msg => msg.userId === wayfinderUserId);
        const burdenedMessages = messageQueue.filter(msg => msg.userId === burdenedUserId);

        const expectMessage = (msg: any, expected: string[]) => {
            expect(msg.stepUi.type === StepType.MessageStep);
            expect(msg.stepUi.messages).toEqual(expected);
        }

        // Check that the doomsayer got the 'goto' which took them to the 'dsmessage' target
        // and the ensuing message:
        expectMessage(doomsayerMessages[0], ["This is sent to the doomsayer"]);
        expect(doomsayerMessages).toHaveLength(1);
        expectMessage(wayfinderMessages[0], ["The non-doomsayers should see this message"]);
        expect(wayfinderMessages).toHaveLength(1);
        expectMessage(burdenedMessages[0], ["The non-doomsayers should see this message"]);
        expect(burdenedMessages).toHaveLength(1);
        
        expect(manager.status).toBe(GameStatus.InReview);
    }, 10000);
});
