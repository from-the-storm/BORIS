/**
 * Routes for logging in, user registration, etc.
 */
import * as express from 'express';

import '../express-extended';
import {config} from '../config';
import {BorisDatabase, User} from '../db/db';
import { InitialStateResponse } from './api-interfaces';

export const router = express.Router();

/**
 * API endpoint for getting data needed to initialize the app's state:
 */
router.post('/get-initial-state', async (req, res) => {
    const db: BorisDatabase = req.app.get("db");
    const result: InitialStateResponse = {};
    if (req.user) {
        result.user = {
            first_name: req.user.first_name,
        };
        const activeTeamMembership = await db.team_members.findOne({user_id: req.user.id, is_active: true});
        if (activeTeamMembership !== null) {
            const team = await db.teams.findOne({id: activeTeamMembership.id});
            result.team = {
                code: team.code,
                name: team.name,
                isTeamAdmin: activeTeamMembership.is_admin,
                otherTeamMembers: [],
            };
        }
    }
    res.json(result);
});
