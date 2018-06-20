/**
 * RESTful admin API for BORIS
 */
import * as express from 'express';
import * as massive from 'massive';

import { UserType } from '../express-extended';
import { config } from '../config';
import { BorisDatabase } from '../db/db';
import { BasicUser, Team, scenarioFromDbScenario, Game } from '../db/models';
import { ApiMethod } from '../../common/api';
import { makeApiHelper, RequireUser } from './api-utils';
import { OtherTeamMember, Scenario } from '../../common/models';
import { isUserOnline } from '../websocket/online-users';

export const router = express.Router();

const defineMethod = makeApiHelper(router, /^\/api\/admin/, RequireUser.AdminUserRequired);

interface ListRequest {
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
function defineListMethod<T>(path: string, fn: (criteria: any, queryOptions: massive.QueryOptions, db: BorisDatabase, user: UserType, app: express.Application) => Promise<ListResponse<T>>) {
    const methodDefinition: ApiMethod<ListRequest, ListResponse<T>> = {path: `/api/admin/${path}`, type: 'GET'};
    defineMethod(methodDefinition, async(data, app, user) => {
        const db: BorisDatabase = app.get("db");
        const limit = Math.max(1, data.perPage ? parseInt(data.perPage, 10) : 100);
        const offset = Math.min(data.page ? (parseInt(data.page, 10) - 1) * limit : 0, 0);
        const criteria = {};
        const queryOptions = {offset, limit};
        const result: ListResponse<T> = await fn(criteria, queryOptions, db, user, app);
        return result;
    });
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

defineListMethod<BasicUser>('users', async (criteria, queryOptions, db, app, user) => {
    return queryWithCount(db.users, criteria, {...queryOptions, fields: ['id', 'first_name', 'email', 'created']});
});

defineListMethod<Team>('teams', async (criteria, queryOptions, db, app, user) => {
    return queryWithCount(db.teams, criteria, {...queryOptions, fields: ['id', 'name', 'organization', 'code', 'created']});
});

defineListMethod<Scenario>('scenarios', async (criteria, queryOptions, db, app, user) => {
    const fields = ['id', 'name', 'duration_min', 'difficulty', 'start_point_name', 'description_html', 'start_point', ];
    const {data, count} = await queryWithCount(db.scenarios, {...criteria, is_active: true}, {...queryOptions, fields});
    const scenarios = data.map( scenarioFromDbScenario );
    return { data: scenarios, count, };
});

defineListMethod<Partial<Game>>('games', async (criteria, queryOptions, db, app, user) => {
    const fields = ['id', 'team_id', 'scenario_id', 'started', 'is_active', 'finished'];
    const {data, count} = await queryWithCount(db.games, {...criteria}, {...queryOptions, fields});
    return { data, count, };
});
