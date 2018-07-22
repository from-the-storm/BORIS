import { BorisDatabase } from "../db/db";
import { User, Team } from "../db/models";
import { alphanumericCodeGenerator } from "../routes/login-register-utils";

// IDs of some same data defined in db/schema/test-data.sql
export const TEST_SCENARIO_ID = 123;


export async function createTeam(db: BorisDatabase, numUsers: number = 3): Promise<{team: Team, teamId: number, user1: User, user2: User, user3: User, user4: User, user5: User}> {
    const codeGenerator = alphanumericCodeGenerator(Math.random(), 5);
    const team = await db.teams.insert({name: `Test Team`, organization: `Test Org`, code: codeGenerator.next().value});
    let result: any = {team, teamId: team.id};
    for (let i = 1; i <= numUsers; i++) {
        const user = await db.users.insert({first_name: `Tester${i}`, email: `tester-${team.id}-${i}@example.com`, survey_data: {q1: 'a1'}});
        await db.team_members.insert({user_id: user.id, team_id: team.id, is_admin: false, is_active: true});
        result['user' + i] = user;
    }
    return result;
}
