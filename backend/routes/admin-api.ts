/**
 * RESTful admin API for BORIS
 */
import * as express from 'express';
import * as massive from 'massive';

import { UserType } from '../express-extended';
import { config } from '../config';
import { BorisDatabase } from '../db/db';
import { BasicUser, Team, scenarioFromDbScenario } from '../db/models';
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

defineListMethod<BasicUser>('users', async (criteria, queryOptions, db, app, user) => {
    const [users, count] = await Promise.all([
        db.users.find(criteria, {...queryOptions, columns: ['id', 'first_name', 'email', 'created']}),
        db.users.count(criteria).then(c => +c),
    ]);
    return { data: users, count, };
});

defineListMethod<Team>('teams', async (criteria, queryOptions, db, app, user) => {
    const [teams, count] = await Promise.all([
        db.teams.find(criteria, {...queryOptions}),
        db.teams.count(criteria).then(c => +c),
    ]);
    return { data: teams, count, };
});

defineListMethod<Scenario>('scenarios', async (criteria, queryOptions, db, app, user) => {
    const [rawScenarios, count] = await Promise.all([
        db.scenarios.find(criteria, {...queryOptions}),
        db.scenarios.count(criteria).then(c => +c),
    ]);
    const scenarios = rawScenarios.map( scenarioFromDbScenario );
    return { data: scenarios, count, };
});
