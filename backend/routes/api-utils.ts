import * as express from 'express';

import { ApiMethod } from './api-interfaces';
import { UserType } from '../express-extended';

/** An error whose message is safe to show to the user */
export class SafeError extends Error {
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
            res.status(400).json({ error: err instanceof SafeError ? err.message : "An internal error occurred handling this API method." });
            return;
        }
    };
}

export enum RequireUser { Required, AnonymousOnly, UserOptional };

export function makeApiHelper(router: express.Router, mountPath: RegExp, requireUser: RequireUser = RequireUser.Required) {

    function checkUserLoggedIn(req: express.Request) {
        if (requireUser === RequireUser.Required && !req.user) {
            throw new SafeError("You are not logged in.");
        } else if (requireUser === RequireUser.AnonymousOnly && req.user) {
            throw new SafeError("You are already logged in.");
        }
    }

    return function apiMethodMaker<RequestType, ResponseType>(def: ApiMethod<RequestType, ResponseType>, fn: (data: RequestType, app: express.Application, user?: UserType) => Promise<ResponseType>) {
        const path = def.path.replace(mountPath, '');
        if (def.type === 'POST') {
            router.post(path, apiErrorWrapper(async (req: express.Request, res: express.Response) => {
                checkUserLoggedIn(req);
                if (!req.body) {
                    throw new SafeError("Missing JSON body.");
                }
                const data: RequestType = req.body;
                const result = await fn(data, req.app, req.user);
                res.json(result);
            }));
        } else if (def.type === 'GET') {
            router.get(path, apiErrorWrapper(async (req: express.Request, res: express.Response) => {
                checkUserLoggedIn(req);
                const data: RequestType = req.query;
                const result = await fn(data, req.app, req.user);
                res.json(result);
            }));
        }
    };
}
