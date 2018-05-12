/**
 * RESTful admin API for BORIS
 */
import * as express from 'express';

import '../express-extended';
import { config } from '../config';
import { BorisDatabase } from '../db/db';
import { User } from '../db/models';
import { ApiMethod } from '../../common/api';
import { makeApiHelper, RequireUser } from './api-utils';
import { OtherTeamMember } from '../../common/models';
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



export const LIST_USERS: ApiMethod<ListRequest, ListResponse<User>> = {path: '/api/admin/users', type: 'GET'};

defineMethod(LIST_USERS, async (data, app, user) => {
    const db: BorisDatabase = app.get("db");
    const limit = Math.max(1, data.perPage ? parseInt(data.perPage, 10) : 100);
    const offset = Math.min(data.page ? (parseInt(data.page, 10) - 1) * limit : 0, 0);
    const users = await db.users.find({}, {offset, limit});
    const count = +await db.users.count({});
    const result: ListResponse<User> = { data: users, count, };
    return result;
});
