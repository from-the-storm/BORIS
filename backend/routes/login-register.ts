/**
 * Routes for logging in, user registration, etc.
 */
import {randomBytes} from 'crypto';
import * as express from 'express';
import * as isEmail from 'validator/lib/isEmail';
import * as passport from 'passport';

import {config} from '../config';
import {BorisDatabase, User} from '../db/db';

export const router = express.Router();

/**
 * API for requesting a login-by-email link
 * 
 * Accepts a JSON body.
 */
router.post('/request-login', async (req, res) => {
    const db: BorisDatabase = req.app.get("db");
    const sendMail = req.app.get('sendMail');
    /*if (req.user) {
        res.status(400).json({ error: "Another user is already logged in" });
        return;
    }*/
    if (!req.body) {
        res.status(400).json({ error: "Missing JSON body." });
        return;
    }
    // Look up the user by email:
    let email: string = req.body.email;
    if (typeof email !== 'string') {
        res.status(400).json({ error: "No email address given." });
        return;
    }
    if (!isEmail(email)) {
        res.status(400).json({ error: "Not a valid email address" });
        return;
    }
    let user = await db.user_by_email(email);
    if (user.id === null) {
        res.status(400).json({ error: "No user with that email address found." });
        return;
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
    res.json({ result: 'ok' });
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
