/**
 * Routes for logging in, user registration, etc.
 */
import {randomBytes} from 'crypto';
import * as express from 'express';
import * as isEmail from 'validator/lib/isEmail';
import * as passport from 'passport';

import {config} from '../config';
import {BorisDatabase, User} from '../db/db';
import {alphanumericCodeGenerator} from './login-register-utils';
import { JoinTeamResponse, JoinTeamRequest, RequestLoginResponse, RequestLoginRequest, EmptyApiResponse, CreateTeamRequest } from './api-interfaces';

// Declare our additions to the Express API:
import { UserType } from '../express-extended';

export const router = express.Router();

class SafeError extends Error {
    // An error whose message is safe to show to the user
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

/** Wrapper around an API call that takes POST body data and requires that the user is logged in. */
function postApiMethodWithUser<RequestData, ResponseData>(fn: (data: RequestData, user: UserType, app: express.Application) => Promise<ResponseData>) {
    return apiErrorWrapper(async (req: express.Request, res: express.Response) => {
        if (!req.user) {
            throw new SafeError("You are not logged in.");
        }
        if (!req.body) {
            throw new SafeError("Missing JSON body.");
        }
        const data: RequestData = req.body;
        const result = await fn(data, req.user, req.app);
        res.json(result);
    });
}

async function sendLoginLinkToUser(app: express.Application, email: string) {
    const db: BorisDatabase = app.get("db");
    const sendMail = app.get('sendMail');
    let user = await db.user_by_email(email);
    if (user.id === null) {
        throw new SafeError("No user with that email address found.");
    }
    // Generate a random code:
    const result = await db.login_requests.insert({user_id: user.id});
    const code = result.code;
    // And send it out via email:
    await sendMail({
        to: email,
        subject: 'Login to Apocalypse Made Easy',
        text: `Click here to login:\n${config.app_url}/auth/login/${code}`,
    });
}

/**
 * API for requesting a login-by-email link
 * 
 * Accepts a JSON body.
 */
router.post('/request-login', apiErrorWrapper(async (req: express.Request, res) => {
    if (req.user) {
        throw new SafeError("Another user is already logged in.");
    }
    if (!req.body) {
        throw new SafeError("Missing JSON body.");
    }
    const body: RequestLoginRequest = req.body;
    // Look up the user by email:
    const email: string = body.email;
    if (typeof email !== 'string') {
        throw new SafeError("No email address given.");
    }
    if (!isEmail(email)) {
        throw new SafeError("Not a valid email address");
    }
    sendLoginLinkToUser(req.app, email);
    const result: RequestLoginResponse = {result: 'ok'};
    res.json(result);
}));

/**
 * View for validating and using a login-by-email link
 */
router.get('/login/:code', (req, res, next) => {
    passport.authenticate('token', (err: any, user: UserType, info: any) => {
        if (err) { return next(err); }
        if (user) {
            // The login succeeded:
            req.login(user, (loginErr) => {
                if (err) { return next(err); }
                return res.redirect('/');
            });
        } else {
            // The login failed:
            return res.render('invalid-login-token');
        }
    })(req, res, next);
});

/** Logout */
router.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

function validateUserData(data: any): Partial<User> {
    const check = (cond: boolean, reason: string) => {
        if (!cond) {
            throw new SafeError(reason);
        }
    }
    // Check hasConsented
    check(data.hasConsented === true, "User must consent to the terms of this program.");
    // Check firstName
    check(data.firstName && typeof data.firstName === 'string', "Missing first name.");
    check(data.firstName.length < 30, "First name is too long.");
    // Check email
    check(data.email && typeof data.email === 'string', "Missing email address");
    check(isEmail(data.email), "Invalid email address");
    // Check stats:
    check(data.workInTech === 'yes' || data.workInTech === 'no', "Missing answer to \"Do you work in tech?\"");
    check(data.occupation && typeof data.occupation === 'string' && data.occupation.length < 500, "Missing/invalid occupation.");
    check(typeof data.age === 'number' && data.age > 10 && data.age < 120, "Missing/invalid age.");
    check(['m', 'f', 'o'].indexOf(data.gender) !== -1, "Missing/invalid gender");
    return {
        first_name: data.firstName,
        email: data.email,
        survey_data: {
            hasConsented: data.hasConsented,
            workInTech: data.workInTech === 'yes',
            occupation: data.occupation,
            age: data.age,
            gender: data.gender,
        }
    };
}

/**
 * API for registering a new user.
 * 
 * Accepts a JSON body.
 */
router.post('/register', async (req, res) => {
    try {
        if (req.user) {
            throw new SafeError("Another user is already logged in.");
        }
        if (!req.body) {
            throw new SafeError("Missing JSON body.");
        }
        // Parse the data from the form:
        const userData = validateUserData(req.body);
        const db: BorisDatabase = req.app.get("db");
        let user: User;
        try {
            user = await db.users.insert(userData);
        } catch (err) {
            if (err.constraint === 'users_email_lower_idx') {
                throw new SafeError("An account with that email address already exists.");
            }
            throw err;
        }
        await sendLoginLinkToUser(req.app, user.email);
        res.json({result: 'ok'});
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err instanceof SafeError ? err.message : "Unable to register you due to an internal error" });
        return;
    }
});

/**
 * API for creating a new team.
 * 
 * Accepts a JSON body.
 */
router.post('/team/create', postApiMethodWithUser<CreateTeamRequest, JoinTeamResponse>(async (data, user, app) => {
    // Parse the data from the form:
    const teamName = (data.teamName || '').trim();
    if (!teamName) { throw new SafeError("Missing team name."); }
    const organizationName = (data.organizationName || '').trim();
    if (!organizationName) { throw new SafeError("Missing team name."); }
    const db: BorisDatabase = app.get("db");
    let newCode: string|null = null;
    let newTeamId: number;
    const result = await db.instance.tx('create_team', async (task) => {
        let codeGen = alphanumericCodeGenerator(Math.random() * 0.95, 5); // 0.95 so that if there is a conflict, we can always generate a few more codes without hitting the max limit
        for (const code of codeGen) {
            console.log(`Creating team with code ${code}`);
            try {
                const result = await task.one(
                    'INSERT INTO teams (name, organization, code) VALUES ($1, $2, $3) RETURNING id',
                    [teamName, organizationName, code]
                );
                newCode = code;
                newTeamId = result.id;
                break;
            } catch (e) {
                if (e.constraint === 'teams_code_key') {
                    // This code was not unique; try again:
                    continue;
                } else {
                    throw e;
                }
            }
        }
        if (newCode === null) {
            throw new SafeError('Unable to create unique code for the team.');
        }
        await task.none('UPDATE team_members SET is_active = false WHERE user_id = $1', [user.id]);
        await task.none(
            'INSERT INTO team_members (user_id, team_id, is_admin, is_active) VALUES ($1, $2, true, true)',
            [user.id, newTeamId]
        );
    });
    return {
        teamName: teamName,
        teamCode: newCode,
        isTeamAdmin: true,
        otherTeamMembers: [],
    };
}));


/**
 * API for joining a new team.
 * 
 * Accepts a JSON body.
 */
router.post('/team/join', postApiMethodWithUser<JoinTeamRequest, JoinTeamResponse>(async (data, user, app) => {
    // Parse the data from the form:
    const code: string = data.code;
    if (!code) {
        throw new SafeError("Missing team code.");
    }
    const db: BorisDatabase = app.get("db");
    // Check if the team is valid
    const team = await db.teams.findOne({code,});
    if (team === null) {
        throw new SafeError(`Invalid team code: ${code}`);
    }
    // Check if the team is full
    const otherTeamMembers: Array<any> = await db.query(
        `SELECT u.first_name, u.id, tm.is_admin from users AS u, team_members tm
         WHERE u.id = tm.user_id AND tm.team_id = $1 AND tm.is_active = true AND tm.user_id <> $2`,
        [team.id, user.id], {}
    );
    if (otherTeamMembers.length > 4) {
        throw new SafeError("Sorry, that team is full. Ask the team admin to remove some other members, or join a different team.");
    }
    // Mark the user as active on this team, and add them as a team member if necessary:
    let isTeamAdmin = false;
    const result = await db.instance.tx('join_team', async (task) => {
        await task.none('UPDATE team_members SET is_active = false WHERE user_id = $1', [user.id]);
        const upsertResult = await task.one(
            `INSERT INTO team_members (user_id, team_id, is_admin, is_active) VALUES ($1, $2, false, true)
             ON CONFLICT (user_id, team_id)
             DO UPDATE SET is_active = true WHERE team_members.user_id = $1 AND team_members.team_id = $2
             RETURNING is_admin`,
            [user.id, team.id]
        );
        isTeamAdmin = upsertResult.is_admin;
    });
    return {
        teamName: team.name,
        teamCode: code,
        isTeamAdmin,
        otherTeamMembers: otherTeamMembers.map((m: any) => ({ name: m.first_name, id: m.id, online: false, isAdmin: m.is_admin })),
    };
}));

/**
 * API for leaving the user's active team.
 *
 * This preserve's the user's association with the team, but it means
 * that team is no longer the user's "active" team. Each user can only
 * be "active" on one team at a time but can be linked to many teams.
 *
 */
router.post('/team/leave', postApiMethodWithUser<{}, EmptyApiResponse>(async (data, user, app) => {
    const db: BorisDatabase = app.get("db");
    await db.team_members.update({user_id: user.id, is_active: true}, {is_active: false});
    return {result: 'ok'};
}));
