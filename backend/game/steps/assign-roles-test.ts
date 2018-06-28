import 'jest';
import { MockGameManager } from '../../test-lib/mock-game-manager';
import { Step } from '../step';
import { getPlayerIdWithRole } from './assign-roles';

const allRoleIds: ReadonlySet<string> = new Set(['D', 'W', 'S', 'I', 'B']);


function expectSetsEqual<T>(set1: ReadonlySet<T>, set2: ReadonlySet<T>) {
    expect(Array.from(set1).sort()).toEqual(Array.from(set2).sort());
}

describe("Assign Roles tests", () => {

    let manager: MockGameManager;
    let step: Step;

    beforeEach(() => {
        manager = new MockGameManager();
        step = MockGameManager.loadStepFromYaml("- step: assignroles", manager);
    });

    for (let numPlayers = 2; numPlayers <=5; numPlayers++) {
        it(`assigns every role to a player when there are ${numPlayers} players`, async () => {
            manager.playerIds = [...Array(numPlayers).keys()];
            expect(step.isComplete).toBe(false);
            await step.run();
            for (const role of allRoleIds) {
                const playerId = getPlayerIdWithRole(manager, role);
                expect(playerId).not.toBeUndefined();
                expect(manager.playerIds).toContain(playerId);
            }
            expect(step.isComplete).toBe(true);
        });
    }

    it("assigns every role to a unique player when there are 5 players", async () => {
        manager.playerIds = [5,6,7,8,9];
        for (const role of allRoleIds) {
            expect(getPlayerIdWithRole(manager, role)).toBeUndefined();
        }
        await step.run();
        let playerIdsAssigned = new Set<number>();
        for (const role of allRoleIds) {
            const playerId = getPlayerIdWithRole(manager, role);
            expect(playerId).not.toBeUndefined();
            expect(playerIdsAssigned).not.toContain(playerId); // No player should have received two roles in this case.
            playerIdsAssigned.add(playerId);
        }
        expectSetsEqual(playerIdsAssigned, new Set(manager.playerIds));
    });

    it("assigns B and D to the same player when there are 4 players", async () => {
        manager.playerIds = [5,6,7,8];
        await step.run();
        
        const idsToCheck = new Set<number>(manager.playerIds);
        const playerW = getPlayerIdWithRole(manager, 'W');
        expect(idsToCheck.delete(playerW)).toBe(true); // Make sure this player ID was in the list of IDs we haven't yet seen, then remove it from that list.
        const playerS = getPlayerIdWithRole(manager, 'S');
        expect(idsToCheck.delete(playerS)).toBe(true);
        const playerI = getPlayerIdWithRole(manager, 'I');
        expect(idsToCheck.delete(playerI)).toBe(true);
        const playerB = getPlayerIdWithRole(manager, 'B');
        const playerD = getPlayerIdWithRole(manager, 'D');
        expect(playerB).toEqual(playerD);
        expect(idsToCheck.delete(playerB)).toBe(true);
        expect(idsToCheck.size).toBe(0);
    });

    it("assigns D&I to one player and B&S to another when there are 3 players", async () => {
        manager.playerIds = [5,6,7];
        await step.run();
        
        const idsToCheck = new Set<number>(manager.playerIds);
        const playerW = getPlayerIdWithRole(manager, 'W');
        expect(idsToCheck.delete(playerW)).toBe(true); // Make sure this player ID was in the list of IDs we haven't yet seen, then remove it from that list.

        const playerD = getPlayerIdWithRole(manager, 'D');
        const playerI = getPlayerIdWithRole(manager, 'I');
        expect(playerD).toEqual(playerI);
        expect(idsToCheck.delete(playerD)).toBe(true);

        const playerB = getPlayerIdWithRole(manager, 'B');
        const playerS = getPlayerIdWithRole(manager, 'S');
        expect(playerB).toEqual(playerS);
        expect(idsToCheck.delete(playerB)).toBe(true);
        expect(idsToCheck.size).toBe(0);
    });

    it("assigns I&W to one player and B&D&S to another when there are 2 players", async () => {
        manager.playerIds = [5,6];
        await step.run();

        const playerI = getPlayerIdWithRole(manager, 'I');
        const playerW = getPlayerIdWithRole(manager, 'W');
        expect(playerI).toEqual(playerW);

        const playerB = getPlayerIdWithRole(manager, 'B');
        const playerD = getPlayerIdWithRole(manager, 'D');
        const playerS = getPlayerIdWithRole(manager, 'S');
        expect(playerB).toEqual(playerD);
        expect(playerB).toEqual(playerS);

        expect(playerI).not.toEqual(playerB);
    });

});
