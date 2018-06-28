import 'jest';
import { getUserIdWithRoleForTeam } from './assign-roles';
import { BorisDatabase, getDB } from '../../db/db';
import { GameManager } from '../manager';
import { TEST_TEAM_ID, TESTER1_ID, TESTER2_ID, TESTER3_ID } from '../../test-lib/test-data';
import { DBScenario } from '../../db/models';
import { AnyNotification, NotificationType } from '../../../common/notifications';
import { AnyUiState, StepType } from '../../../common/game';

describe("Assign Roles Integration tests", () => {
    let db: BorisDatabase;
    let scenario: DBScenario;
    let testContext: {db: BorisDatabase, publishEventToUsers: (userIds: number[], event: AnyNotification) => void};
    let messageQueue: {userId: number, stepIndex: number, stepUi: AnyUiState}[];
    beforeAll(async () => {
        db = await getDB();
        scenario = (await db.scenarios.insert({
            is_active: true,
            name: "Test Scenario",
            script: 'test-roles-script',
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

    describe("Role assignments", () => {
        it("If the team completes the mission, the assigned roles are remembered so that they can affect the Market etc.", async () => {
            expect(await getUserIdWithRoleForTeam('D', TEST_TEAM_ID, db)).toBeUndefined(); // If this is not the case, we need better test isolation. Use new users + teams for this test instead of a shared user.
            const {manager, status} = await GameManager.startGame(TEST_TEAM_ID, scenario.id, testContext);
            await manager.allPendingStepsFlushed();
            // Now one of the three users should be the doomSayer
            const doomsayerUserId = await getUserIdWithRoleForTeam('D', TEST_TEAM_ID, db);
            expect(doomsayerUserId).not.toBeUndefined();
            expect([TESTER1_ID, TESTER2_ID, TESTER3_ID]).toContain(doomsayerUserId);
            // And that should persist after the game:
            await manager.finish();
            expect(await getUserIdWithRoleForTeam('D', TEST_TEAM_ID, db)).toBe(doomsayerUserId);
        });
    });

    describe("Role-specific messages", () => {
        it("Sends the first few steps to the correct roles in the correct order", async () =>{
            const {manager} = await GameManager.startGame(TEST_TEAM_ID, scenario.id, testContext);
            await manager.allPendingStepsFlushed();
            const doomsayerUserId = await getUserIdWithRoleForTeam('D', TEST_TEAM_ID, db);
            expect(doomsayerUserId).not.toBeUndefined();
            // Check that the first message was the one sent to the two non-doomsayers:
            for (let i = 0; i < 2; i++) {
                const firstOrSecondMessage = messageQueue.shift();
                expect(firstOrSecondMessage.stepUi.type === StepType.MessageStep && firstOrSecondMessage.stepUi.messages).toEqual(
                    ["This should always be the first message. Sent to all but Doomsayer"]
                );
                expect(firstOrSecondMessage.userId).not.toBe(doomsayerUserId);
            }
            // The next message should be sent to the doomsayer:
            const thirdMessage = messageQueue.shift();
            expect(thirdMessage.stepUi.type === StepType.MessageStep && thirdMessage.stepUi.messages).toEqual(
                ["This is sent to the Doomsayer only."]
            );
            expect(thirdMessage.userId).toBe(doomsayerUserId);
            // Next should be a prompt for the Doomsayer to press Done to continue:
            const fourthMessage = messageQueue.shift();
            expect(fourthMessage.stepUi.type === StepType.MultipleChoice && fourthMessage.stepUi.choices).toEqual(
                [{choiceText: "Done", "correct": null, "id": "x", "selected": false}],
            );
            // And the next message to everyone should be held back until the doomsayer makes a selection:
            expect(messageQueue.shift()).toBeUndefined();
            await manager.abandon();
        });
    });
});
