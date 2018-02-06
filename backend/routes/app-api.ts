/**
 * Routes for logging in, user registration, etc.
 */
import * as express from 'express';

import '../express-extended';
import {config} from '../config';
import {BorisDatabase, User} from '../db/db';

export const router = express.Router();

/**
 * API endpoint for getting data needed to initialize the app's state:
 */
router.post('/get-initial-state', (req, res) => {
    res.json({
        user: req.user ? {
            first_name: req.user.first_name,
        } : null,
    });
});
