import * as express from 'express';

import { ApiMethod } from '../../common/api';
import { BorisDatabase } from '../db/db';
import { User } from '../db/models';

/** An error whose message is safe to show to the user */
export class SafeError extends Error {
    httpStatusCode?: number;
    constructor(message: string, httpStatusCode?: number) {
        super(message);
        this.httpStatusCode = httpStatusCode;
    }
}

/**
 * Wrap a REST API handler method, and ensure that if an error occurs, a consistent error
 * JSON result is returned, and that the error details don't leak sensitive info.
 * Only errors that are instances of 'SafeError' will be reported; other errors will just
 * say 'An internal error occurred'.
 *
 * @param fn The API handler to wrap
 */
function apiErrorWrapper(fn: (req: express.Request, res: express.Response) => Promise<any>) {
    return async (req: express.Request, res: express.Response) => {
        try {
            await fn(req, res);
        } catch (err) {
            console.error(err);
            if (err instanceof SafeError) {
                res.status(err.httpStatusCode || 400).json({ error: err.message });
            } else {
                res.status(400).json({ error: "An internal error occurred handling this API method." });
            }
        }
    };
}

export enum RequireUser { Required, AnonymousOnly, UserOptional, AdminUserRequired };

export async function isAdminUser(req: express.Request) {
    const db: BorisDatabase = req.app.get('db');
    const isAdminResult = await db.admin_users.findOne({user_id: req.user.id});
    return (isAdminResult !== null && isAdminResult.user_id === req.user.id);
}

export function makeApiHelper(router: express.Router, mountPath: RegExp, requireUser: RequireUser = RequireUser.Required) {

    async function checkUserLoggedIn(req: express.Request) {
        if (requireUser === RequireUser.Required || requireUser == RequireUser.AdminUserRequired) {
            if (!req.user) {
                throw new SafeError("You are not logged in.", 401);
            }
            if (requireUser == RequireUser.AdminUserRequired && !(await isAdminUser(req))) {
                throw new SafeError("You are not an admin user.", 403);
            }
        } else if (requireUser === RequireUser.AnonymousOnly && req.user) {
            throw new SafeError("You are already logged in.");
        }
    }

    return function apiMethodMaker<RequestType, ResponseType>(def: ApiMethod<RequestType, ResponseType>, fn: (data: RequestType, app: express.Application, user?: User) => Promise<ResponseType>) {
        const path = def.path.replace(mountPath, '');
        if (def.type === 'POST' || def.type === 'PUT') {
            const handler = apiErrorWrapper(async (req: express.Request, res: express.Response) => {
                await checkUserLoggedIn(req);
                if (!req.body) {
                    throw new SafeError("Missing JSON body.");
                }
                const data: RequestType = {...req.body, ...req.params};
                const result = await fn(data, req.app, req.user);
                res.json(result);
            });
            if (def.type === 'POST') {
                router.post(path, handler);
            } else if (def.type === 'PUT') {
                router.put(path, handler);
            }
        } else if (def.type === 'GET') {
            router.get(path, apiErrorWrapper(async (req: express.Request, res: express.Response) => {
                await checkUserLoggedIn(req);
                const data: RequestType = {...req.query, ...req.params};
                const result = await fn(data, req.app, req.user);
                res.json(result);
            }));
        }
    };
}
