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

// Declare our additions to the Express API:
import '../express-extended';

export const router = express.Router();

class SafeError extends Error {
    // An error whose message is safe to show to the user
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
router.post('/request-login', async (req: express.Request, res) => {
    try {
        if (req.user) {
            throw new SafeError("Another user is already logged in.");
        }
        if (!req.body) {
            throw new SafeError("Missing JSON body.");
        }
        // Look up the user by email:
        const email: string = req.body.email;
        if (typeof email !== 'string') {
            throw new SafeError("No email address given.");
        }
        if (!isEmail(email)) {
            throw new SafeError("Not a valid email address");
        }
        sendLoginLinkToUser(req.app, email);
        res.json({result: 'ok'});
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err instanceof SafeError ? err.message : "Unable to send email due to an internal error" });
        return;
    }
});

/**
 * View for validating and using a login-by-email link
 */
router.get('/login/:code', (req, res, next) => {
    passport.authenticate('token', (err, user, info) => {
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
router.post('/team/create', async (req, res) => {
    try {
        if (!req.user) {
            throw new SafeError(`You need to be logged in to create a team. ${req.user}`);
        }
        if (!req.body) {
            throw new SafeError("Missing JSON body.");
        }
        // Parse the data from the form:
        const teamName = (req.body.teamName || '').trim();
        if (!teamName) { throw new SafeError("Missing team name."); }
        const organizationName = (req.body.organizationName || '').trim();
        if (!organizationName) { throw new SafeError("Missing team name."); }
        const db: BorisDatabase = req.app.get("db");
        let newCode = null;
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
            await task.none(
                'INSERT INTO team_members (user_id, team_id, is_admin) VALUES ($1, $2, true)',
                [req.user.id, newTeamId]
            );
        });
        res.json({
            result: 'ok',
            teamName: teamName,
            teamCode: newCode,
        });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err instanceof SafeError ? err.message : "Unable to create team due to an internal error" });
        return;
    }
});
