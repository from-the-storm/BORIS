/**
 * RESTful admin API for BORIS
 */
import * as express from 'express';
import * as massive from 'massive';

import { BorisDatabase } from '../db/db';
import { BasicUser, Team, scenarioFromDbScenario, Game, DBScenario, User } from '../db/models';
import { ApiMethod } from '../../common/api';
import { makeApiHelper, RequireUser, SafeError } from './api-utils';
import { Scenario } from '../../common/models';
import { validateScriptYaml } from '../game/script-loader';

export const router = express.Router();

const defineMethod = makeApiHelper(router, /^\/api\/admin/, RequireUser.AdminUserRequired);

interface ListRequest {
    // Since these are query params, everything is typed as a string.
    sort?: string;
    page?: string;
    perPage?: string;
    filter?: string;
};
interface ListResponse<T> {
    data: T[],
    count: number,
}
/**
 * Helper function for defining a REST API andpoint that returns a list of objects
 * Mostly this adds pagination support
 * @param path The URL path to this resource, excluding the API prefix that all endpoints share
 * @param fn A method that loads the data from the database and returns it, along with a total count.
 */
function defineListMethod<T>(path: string, fn: (filter: any, criteria: any, queryOptions: massive.QueryOptions, db: BorisDatabase, user: User, app: express.Application) => Promise<ListResponse<T>>) {
    const methodDefinition: ApiMethod<ListRequest, ListResponse<T>> = {path: `/api/admin/${path}`, type: 'GET'};
    defineMethod(methodDefinition, async(data, app, user) => {
        const db: BorisDatabase = app.get("db");
        const limit = Math.max(1, data.perPage ? parseInt(data.perPage, 10) : 100);
        const offset = Math.max(0, data.page ? (parseInt(data.page, 10) - 1) * limit : 0);
        let filter: any = null;
        let criteria: any = {};
        if (data.filter) {
            try {
                filter = JSON.parse(data.filter);
            } catch (err) {
                throw new SafeError("Unable to parse filter value.");
            }
            if (filter.id) {
                criteria.id = filter.id;
            }
        }
        const queryOptions = {offset, limit};
        const result: ListResponse<T> = await fn(filter, criteria, queryOptions, db, user, app);
        return result;
    });
    return methodDefinition;
}
/**
 * Find all mathing obects from a PostgreSQL/MassiveJS table, also returning the total
 * number as if no 'limit' clause were applied.
 *
 * You MUST explicitly specify either 'fields' or 'columns' in the options, otherwise
 * no columns will be returned.
 *
 * @param table A massiveJS database table
 * @param criteria optional filtering criteria
 * @param _options query options
 */
async function queryWithCount<T>(table: massive.Table<T>, criteria: any, _options: any): Promise<{data: T[], count: number}> {
    let options = {exprs: {}, ..._options};
    options.exprs.full_count = 'count(*) OVER ()'; // Merge 'full_count' expression into any existing 'exprs' option
    const results: any = await table.find(criteria, options);
    if (results.length === 0) {
        return {data: [], count: 0};
    } else {
        const count = results[0].full_count;
        return {
            count,
            data: results.map((r: any) => { delete r.full_count; return r; }),
        }
    }
}

export const LIST_USERS = defineListMethod<BasicUser>('users', async (filter, criteria, queryOptions, db, app, user) => {
    return queryWithCount(db.users, criteria, {...queryOptions, fields: ['id', 'first_name', 'email', 'created']});
});

export const LIST_TEAMS = defineListMethod<Team>('teams', async (filter, criteria, queryOptions, db, app, user) => {
    return queryWithCount(db.teams, criteria, {...queryOptions, fields: ['id', 'name', 'organization', 'code', 'created']});
});



export const GET_TEAM: ApiMethod<{id: string}, Team&{game_vars: any}> = {path: `/api/admin/teams/:id`, type: 'GET'};
defineMethod(GET_TEAM, async (data, app, user) => {
    const db: BorisDatabase = app.get("db");
    const id = parseInt(data.id, 10);
    if (isNaN(id)) {
        throw new SafeError(`Invalid team ID.`);
    }
    const team = await db.teams.findOne(id);
    if (team === null) {
        throw new SafeError(`Team ${id} not found.`, 404);
    }
    const members = await db.query(
        `SELECT user_id, first_name, email FROM team_members tm, users u WHERE tm.team_id = $1 AND is_active = 'true' AND u.id = tm.user_id`,
        [team.id], {}
    );
    return {
        id: team.id,
        name: team.name,
        organization: team.organization,
        code: team.code,
        created: team.created,
        members,
        game_vars: team.game_vars,
    };
});

/** Reset the game vars (saltines earned, role assignments, game history, etc.) for the given team. Obviously dangerous/destructive. */
export const RESET_TEAM_VARS: ApiMethod<{id: string}, {}> = {path: `/api/admin/teams/:id/reset-vars`, type: 'POST'};
defineMethod(RESET_TEAM_VARS, async (data, app, user) => {
    const db: BorisDatabase = app.get("db");
    const id = parseInt(data.id, 10);
    if (isNaN(id)) {
        throw new SafeError(`Invalid team ID.`);
    }
    const team = await db.teams.findOne(id);
    if (team === null) {
        throw new SafeError(`Team ${id} not found.`, 404);
    }
    await db.teams.update({id,}, {game_vars: {}});
    await db.games.destroy({team_id: id});
    return {result: 'ok'};
});

interface ScenarioWithScript extends Scenario {
    script: string;
}

export const LIST_SCENARIOS = defineListMethod<ScenarioWithScript>('scenarios', async (filter, criteria, queryOptions, db, app, user) => {
    const fields = ['id', 'name', 'duration_min', 'difficulty', 'start_point_name', 'is_active', 'script', 'description_html', 'start_point', ];
    const {data, count} = await queryWithCount(db.scenarios, criteria, {...queryOptions, fields});
    const scenarios = data.map( s => ({...s, start_point: {lat: s.start_point.x, lng: s.start_point.y}}) );
    return { data: scenarios, count, };
});

/**
 * A Scenario containing all the fields we would edit in the admin.
 * Includes a couple additional fields that we don't send via other
 * API endpoints.
 **/
interface AdminScenario extends Scenario {
    is_active: boolean;
    script: string;
}
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type AdminScenarioNoId = Omit<AdminScenario, 'id'>;
/**
 * Our Postgres API retrieves point types in a different way than we need to specify them for INSERT/UPDATE so
 * we have to override the type of 'start_point' for INSERT or UPDATE:
 */
type DBScenarioForInsertOrUpdate = Omit<DBScenario, 'start_point'> & {'start_point': string};
function adminScenarioFromDBScenario(scenarioData: DBScenario): AdminScenario {
    return {
        ...scenarioFromDbScenario(scenarioData),
        is_active: scenarioData.is_active,
        script: scenarioData.script,
    };
}

function cleanScenarioDataForInsertOrUpdate(data: Partial<AdminScenarioNoId>): Partial<DBScenarioForInsertOrUpdate> {
    const cleanData: Partial<DBScenarioForInsertOrUpdate> = {};
    for (const field of ['name', 'is_active', 'script', 'start_point_name', 'duration_min', 'description_html']) {
        if ((data as any)[field] !== undefined) { (cleanData as any)[field] = (data as any)[field]; };
    }
    if (data.start_point !== undefined) {
        cleanData.start_point = `${data.start_point.lat}, ${data.start_point.lng}`;
    }
    if (data.difficulty !== undefined) {
        cleanData.difficulty = (
            data.difficulty === 'easy' ? 'easy' :
            data.difficulty === 'hard' ? 'hard' :
            'med'
        );
    }
    return cleanData;
}

export const GET_SCENARIO: ApiMethod<{id: string}, AdminScenario> = {path: `/api/admin/scenarios/:id`, type: 'GET'};
defineMethod(GET_SCENARIO, async (data, app, user) => {
    const db: BorisDatabase = app.get("db");
    const id = parseInt(data.id, 10);
    if (isNaN(id)) {
        throw new SafeError(`Invalid scenario ID.`);
    }
    const scenario = await db.scenarios.findOne(id);
    if (scenario === null) {
        throw new SafeError(`Scenario ${id} not found.`, 404);
    }
    return adminScenarioFromDBScenario(scenario);
});

export const CREATE_SCENARIO: ApiMethod<Partial<AdminScenarioNoId>, AdminScenario> = {path: `/api/admin/scenarios`, type: 'POST'};
defineMethod(CREATE_SCENARIO, async (data, app, user) => {
    const db: BorisDatabase = app.get("db");
    const insertData = cleanScenarioDataForInsertOrUpdate(data);

    let scenario: DBScenario;
    try {
        scenario = await db.scenarios.insert(insertData);
    } catch (err) {
        throw new SafeError(`Unable to save scenario "${data.name}": ${err.message}`, 400);
    }
    return adminScenarioFromDBScenario(scenario);
});

export const EDIT_SCENARIO: ApiMethod<{id: string}&Partial<AdminScenarioNoId>, AdminScenario> = {path: `/api/admin/scenarios/:id`, type: 'PUT'};
defineMethod(EDIT_SCENARIO, async (data, app, user) => {
    const db: BorisDatabase = app.get("db");
    const scenarioId = parseInt(data.id, 20);
    const dbData = cleanScenarioDataForInsertOrUpdate(data);

    let scenario: DBScenario;
    try {
        scenario = ((await db.scenarios.update({id: scenarioId}, dbData)) as any as DBScenario[])[0];
    } catch (err) {
        throw new SafeError(`Unable to save scenario "${data.name}"`, 400);
    }
    return adminScenarioFromDBScenario(scenario);
});


export const LIST_SCRIPTS = defineListMethod<{name: string}>('scripts', async (filter, criteria, queryOptions, db, app, user) => {
    return queryWithCount(db.scripts, criteria, {...queryOptions, fields: ['name']});
});

export const GET_SCRIPT: ApiMethod<{id: string}, {name: string, script_yaml: string}> = {path: `/api/admin/scripts/:id`, type: 'GET'};
defineMethod(GET_SCRIPT, async (data, app, user) => {
    const db: BorisDatabase = app.get("db");
    const script = await db.scripts.findOne({name: data.id});
    if (script === null) {
        throw new SafeError(`Script "${data.id}" not found.`, 404);
    }
    return {
        name: script.name,
        script_yaml: script.script_yaml,
    };
});

export const CREATE_SCRIPT: ApiMethod<{name: string, script_yaml: string}, {name: string}> = {path: `/api/admin/scripts`, type: 'POST'};
defineMethod(CREATE_SCRIPT, async (data, app, user) => {
    const db: BorisDatabase = app.get("db");
    const name = (data.name || "").trim();
    if (!name) {
        throw new SafeError(`Bad script name: "${name}".`);
    }
    await validateScriptYaml(db, data.script_yaml, name);

    try {
        await db.scripts.insert({name, script_yaml: data.script_yaml});
    } catch (err) {
        throw new SafeError(`Unable to save script "${name}". Does a script with that name already exist?`, 400);
    }
    return {
        name,
    };
});

export const EDIT_SCRIPT: ApiMethod<{id: string, script_yaml: string}, {name: string, script_yaml: string}> = {path: `/api/admin/scripts/:id`, type: 'PUT'};
defineMethod(EDIT_SCRIPT, async (data, app, user) => {
    const db: BorisDatabase = app.get("db");
    const name = data.id;
    await validateScriptYaml(db, data.script_yaml, name);

    try {
        await db.scripts.update({name,}, {script_yaml: data.script_yaml});
    } catch (err) {
        throw new SafeError(`Unable to save script "${data.id}".`, 400);
    }
    return { name, script_yaml: data.script_yaml};
});

export const LIST_GAMES = defineListMethod<Partial<Game>>('games', async (filter, criteria, queryOptions, db, app, user) => {
    const fields = ['id', 'team_id', 'scenario_id', 'started', 'is_active', 'finished'];
    if (filter && filter.statusFilter !== undefined) {
        if (filter.statusFilter === 'active') {
            criteria.is_active = true;
        } else if (filter.statusFilter === 'completed') {
            criteria['finished IS NOT'] = null;
        } else if (filter.statusFilter === 'abandoned') {
            criteria.is_active = false;
            criteria['finished IS'] = null;
        }
    }
    const {data, count} = await queryWithCount(db.games, criteria, {...queryOptions, fields});
    const dataWithMinTaken = data.map( game => ({...game,
        time_taken: game.finished ? Math.round((+game.finished - +game.started) / 60_000) + 'm' : '',
    }) );
    return { data: dataWithMinTaken, count, };
});
