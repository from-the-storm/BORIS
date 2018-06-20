import { BorisDatabase } from "../db/db";
import { GameVar, GameVarScope } from "./vars";

/**
 * Get the value of a team-scoped variable.
 * @param variable 
 * @param teamId 
 * @param db 
 */
export async function getTeamVar<T>(variable: GameVar<T>, teamId: number, db: BorisDatabase): Promise<T> {
    if (variable.scope !== GameVarScope.Team) {
        throw new Error("Invalid Scope");
    }
    const team = await db.teams.findOne(teamId);
    const activeGame = await db.games.findOne({team_id: teamId, is_active: true});
    if (activeGame !== null && variable.key in activeGame.pending_team_vars) {
        return activeGame.pending_team_vars[variable.key];
    }
    return (variable.key in team.game_vars) ? team.game_vars[variable.key] : variable.default;
}
