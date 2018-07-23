import { StepType } from "../../../common/game";
import { Step } from "../step";
import { GameVar, GameVarScope } from "../vars";
import { GameManagerStepInterface } from "../manager-defs";
import { getTeamVar } from "../team-vars";
import { BorisDatabase } from "../../db/db";

// For now roles are hard-coded:
const roleAssignmentsByNumPlayers: {[idx: number]: string[]} = Object.freeze({
    // 5 players: WAYFINDER, SCIENTICIAN, INTERPRETER, HE BURDENED, DOOMSAYER
    5: ['W', 'S', 'I', 'B', 'D'],
    // 4 players: WAYFINDER; SCIENTICIAN; INTERPRETER; THE BURDENED DOOMSAYER
    4: ['W', 'S', 'I', 'BD'],
    // 3 players: WAYFINDER; DOOMSAYING INTERPRETER; BURDENED SCIENTICIAN
    3: ['W', 'DI', 'BS'],
    // 2 players: INTERPRETIVE WAYFINDER; THE BURDENED, DOOMSAYING SCIENTICIAN
    2: ['IW', 'BDS'],
});

/** Helper method to check if two sets contain exactly the same values */
function areSetsEqual<T>(set1: ReadonlySet<T>, set2: ReadonlySet<T>): boolean {
    if (set1.size !== set2.size) {
        return false;
    }
    for (const element of set1) {
        if (!set2.has(element)) {
            return false;
        }
    }
    return true;
}

/**
 * Stores the IDs of all the players once this step runs successfully.
 *
 * Once this step has run successfully, it will shuffle the roles and assign
 * them to all the players who are currently playing. If for some reason the
 * set of players changed in mid-game (e.g. a person's phone died or someone
 * joined the team), the game engine should start the script over, and this
 * step should detect that the set of players has changed, using this variable
 * which stores the IDs of all the players at the time the roles were last
 * shuffled.
 * 
 * This is a Game-scoped variable because even though role assignments may
 * need to be read after the game outside of the game context, we always
 * want to give out new random role assignments whenever starting a new game,
 * so people aren't stuck in the same role for multiple scenarios.
 */
const rolesHaveBeenShuffledForPlayers: GameVar<number[]> = {key: 'roles-shuffled', scope: GameVarScope.Game, default: []};

export class AssignRolesStep extends Step {
    public static readonly stepType: StepType = StepType.Internal;  // Any step that never has any UI can have type internal
    readonly settings: {};

    async run() {
        if (this.isComplete) {
            return;
        }
        // Assign roles:
        const currentPlayerIds: ReadonlySet<number> = new Set(this.getPlayerIds());
        const numPlayers = currentPlayerIds.size;
        const roleGroups = roleAssignmentsByNumPlayers[numPlayers];
        if (roleGroups === undefined) {
            throw new Error(`Invalid number of players (${numPlayers}).`);
        }
        if (roleGroups.length !== numPlayers) {
            throw new Error(`Role definitions for ${numPlayers} players are invalid.`);
        }
        // Shuffle the role groups (a group is a set of roles that one player will get, e.g. 'BDS')
        const roleGroupsShuffled: string[] = [];
        for (const group of roleGroups) {
            // Insert each group into a random spot in roleGroupsShuffled:
            const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min; // min and max are inclusive
            roleGroupsShuffled.splice(getRandomInt(0, roleGroupsShuffled.length), 0, group);
        }
        // Now assign the roles to each player:
        for (const playerId of currentPlayerIds) {
            const rolesForThisPlayer = roleGroupsShuffled.pop().split('');
            for (const roleId of rolesForThisPlayer) {
                await this.setVar(AssignRolesStep.roleVarFor(roleId), playerId);
            }
        }
        // And record the fact that we have successfully assigned roles for this particular set of players:
        await this.setVar(rolesHaveBeenShuffledForPlayers, Array.from(currentPlayerIds));
    }

    static roleVarFor(roleLetter: string): GameVar<number|undefined> {
        return {key: `role:${roleLetter}`, scope: GameVarScope.Team, default: undefined};
    }

    getUiState(): null {
        return null;
    }

    /** Have roles been assigned? */
    public get isComplete() {
        const playerIdsShuffledAlready: ReadonlySet<number> = new Set(this.getVar(rolesHaveBeenShuffledForPlayers));
        const currentPlayerIds: ReadonlySet<number> = new Set(this.getPlayerIds());
        return areSetsEqual(playerIdsShuffledAlready, currentPlayerIds);
    }
}

/**
 * Given a role ID (like 'B'), return the ID of the player that has that role in the given game
 * @param gameManager The GameManager
 * @param roleId The role letter, like 'B' for The Burdened
 */
export function getPlayerIdWithRole(gameManager: GameManagerStepInterface, roleId: string): number|undefined {
    return gameManager.getVar(AssignRolesStep.roleVarFor(roleId));
}

/**
 * Given a role ID, return the ID of the player who has that role on a given team, as of the last game
 * that they played.
 * @param roleId The role in question, e.g. 'D'
 * @param teamId The ID of the team in question
 * @param db the Boris Database
 */
export async function getUserIdWithRoleForTeam(roleId: string, teamId: number, db: BorisDatabase): Promise<number|undefined> {
    return await getTeamVar(AssignRolesStep.roleVarFor(roleId), teamId, db);
}
