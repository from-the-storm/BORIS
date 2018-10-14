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

/**
 * Set the value of a team-scoped variable outside of a game.
 * @param variable 
 * @param teamId 
 * @param db 
 */
export async function setTeamVar<T>(variable: GameVar<T>, updater: (value: T) => T, teamId: number, db: BorisDatabase): Promise<T> {
    if (variable.scope !== GameVarScope.Team) {
        throw new Error("Invalid Scope");
    }
    if (await db.teams.findOne(teamId) === null) {
        throw new Error("Invalid team");
    }
    const activeGame = await db.games.findOne({team_id: teamId, is_active: true});
    if (activeGame !== null) {
        throw new Error("This method is not meant for use while a game is running. Use GameManager.setVar() instead.");
    }
    const newValue = await db.instance.tx('update_team_var', async (task) => {
        const origData = await task.one('SELECT game_vars FROM teams WHERE id = $1 FOR UPDATE', [teamId]);
        const origValue: T = variable.key in origData.game_vars ? origData.game_vars[variable.key] : variable.default;
        const newValue: any = updater(origValue);
        let insertValue = newValue, forceCast = '';
        if (newValue === null) { // Storing NULL is tricky:
            insertValue = 'null';
            forceCast = '::jsonb';
        } else if (typeof newValue === 'string') {
            forceCast = '::text'; // to_jsonb() needs to know how to interpret a string type.
        }
        await task.none(
            // use jsonb_set to guarantee that we don't affect other variables
            `UPDATE teams SET game_vars = jsonb_set(game_vars, $2, to_jsonb($3${forceCast})) WHERE id = $1`,
            [teamId, `{${variable.key}}`, insertValue],
        );
        return newValue;
    });
    return newValue;
}
