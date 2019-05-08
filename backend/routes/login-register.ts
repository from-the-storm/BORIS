/**
 * Routes for logging in, user registration, etc.
 */
import * as express from 'express';
import * as isEmail from 'validator/lib/isEmail';
import * as passport from 'passport';

import { isValidGender } from '../../common/models';
import {config} from '../config';
import {BorisDatabase} from '../db/db';
import { User } from '../db/models';
import {alphanumericCodeGenerator} from './login-register-utils';
import { JOIN_TEAM, LEAVE_TEAM, CREATE_TEAM, REQUEST_LOGIN, REGISTER_USER, KICK_OFF_TEAM } from '../../common/api';

// Declare our additions to the Express API:
import { makeApiHelper, RequireUser, SafeError } from './api-utils';
import { notifyTeamStatusChanged } from '../websocket/team-changed';
import { readFile } from 'fs';
import { promisify } from 'util';

const readFileAsync = promisify(readFile);

export const router = express.Router();
const mountPoint = /^\/auth/;

const postApiMethodAnonymousOnly = makeApiHelper(router, mountPoint, RequireUser.AnonymousOnly);
const postApiMethodWithUser = makeApiHelper(router, mountPoint, RequireUser.Required);

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
    // Load the template file:
    const htmlTemplate = String(await readFileAsync(`${__dirname}/login-template.html`));
    const html = (htmlTemplate
        .replace(/{{login_url}}/g, `${config.app_url}/auth/login/${code}`)
        .replace(/{{first_name}}/g, user.first_name)
    );
    // And send it out via email:
    await sendMail({
        html,
        to: `${user.first_name} <${email}>`,
        subject: 'Log in to Apocalypse Made Easy',
    });
}

/**
 * API for requesting a login-by-email link
 * 
 * Accepts a JSON body.
 */
postApiMethodAnonymousOnly(REQUEST_LOGIN, async (data, app) => {
    // Look up the user by email:
    const email: string = data.email;
    if (typeof email !== 'string') {
        throw new SafeError("No email address given.");
    }
    if (!isEmail(email)) {
        throw new SafeError("Not a valid email address");
    }
    await sendLoginLinkToUser(app, email);
    return {result: 'ok'};
});

/**
 * View for validating and using a login-by-email link
 */
router.get('/login/:code', (req, res, next) => {
    passport.authenticate('token', (err: any, user: User, info: any) => {
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
    check(isValidGender(data.gender), "Missing/invalid gender");
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
postApiMethodAnonymousOnly(REGISTER_USER,  async (data, app) => {
    // Parse the data from the form:
    const userData = validateUserData(data);
    const db: BorisDatabase = app.get("db");
    let user: User;
    try {
        user = await db.users.insert(userData);
    } catch (err) {
        if (err.constraint === 'users_email_lower_idx') {
            throw new SafeError("An account with that email address already exists.");
        }
        throw err;
    }
    await sendLoginLinkToUser(app, user.email);
    return {result: 'ok'};
});

/**
 * API for creating a new team.
 * 
 * Accepts a JSON body.
 */
postApiMethodWithUser(CREATE_TEAM, async (data, app, user) => {
    // Parse the data from the form:
    const teamName = (data.teamName || '').trim();
    if (!teamName) { throw new SafeError("Missing team name."); }
    const organizationName = (data.organizationName || '').trim();
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
});


/**
 * API for joining a new team.
 * 
 * Accepts a JSON body.
 */
postApiMethodWithUser(JOIN_TEAM, (async (data, app, user) => {
    // Parse the data from the form:
    const code: string = (data.code || '').toUpperCase();
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
    notifyTeamStatusChanged(app, team.id);
    return {
        teamName: team.name,
        teamCode: code,
        isTeamAdmin,
        otherTeamMembers: otherTeamMembers.map((m: any) => ({ name: m.first_name, id: m.id, online: false, isAdmin: m.is_admin })),
    };
}));

async function removeUserFromTeam(userId: number, app: express.Application) {
    const db: BorisDatabase = app.get("db");
    const rows: any = await db.team_members.update({user_id: userId, is_active: true}, {is_active: false});
    if (rows.length === 1) {
        // Notify the team that this user has left:
        notifyTeamStatusChanged(app, rows[0].team_id);
    }
}

/**
 * API for leaving the user's active team.
 *
 * This preserve's the user's association with the team, but it means
 * that team is no longer the user's "active" team. Each user can only
 * be "active" on one team at a time but can be linked to many teams.
 *
 */
postApiMethodWithUser(LEAVE_TEAM, async (data, app, user) => {
    await removeUserFromTeam(user.id, app);
    return {result: 'ok'};
});

/**
 * API for kicking a user off a team.
 *
 * This preserve's the user's association with the team, but it means
 * that team is no longer the user's "active" team. Each user can only
 * be "active" on one team at a time but can be linked to many teams.
 *
 */
postApiMethodWithUser(KICK_OFF_TEAM, async (data, app, user) => {
    const db: BorisDatabase = app.get("db");
    const currentUserMembership = await db.team_members.findOne({user_id: user.id, is_active: true, is_admin: true});
    if (currentUserMembership === null) {
        throw new SafeError("You are not a team admin", 403);
    }
    const targetUserMembership = await db.team_members.findOne({user_id: data.teamMemberId, is_active: true});
    if (currentUserMembership.team_id != targetUserMembership.team_id) {
        throw new SafeError("That user is not part of your team");
    }
    await removeUserFromTeam(data.teamMemberId, app);
    return {result: 'ok'};
});

