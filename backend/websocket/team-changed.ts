import * as express from 'express';

import { BorisDatabase } from '../db/db';
import { publishEvent } from './pub-sub';
import { NotificationType } from '../../common/notifications';
import { OtherTeamMember } from '../../common/models';
import { isUserOnline } from './online-users';

/**
 * Notify all users on the given team that the team has changed.
 * e.g. a user came online or went offline, or someone joined the team.
 */
export async function notifyTeamStatusChanged(app: express.Application, teamId: number) {
    const db: BorisDatabase = app.get("db");
    const queryResult = await db.query(
        `SELECT * FROM team_members tm, users u WHERE tm.team_id = $1 AND is_active = 'true' AND u.id = tm.user_id`,
        [teamId], {}
    );
    const teamMembers: OtherTeamMember[] = [];
    for (let row of queryResult) {
        teamMembers.push({
            name: row.first_name,
            id: row.user_id,
            online: await isUserOnline(row.user_id),
            isAdmin: row.is_admin,
        });
    }
    publishEvent(teamId, {type: NotificationType.TEAM_CHANGED, teamMembers});
}

/**
 * Notify all users on the given user's team that the team has changed.
 * e.g. a user came online or went offline, or someone joined the team.
 */
export async function notifyTeamStatusChangedForUser(app: express.Application, userId: number) {
    const db: BorisDatabase = app.get("db");
    const membership = await db.team_members.findOne({user_id: userId, is_active: true});
    if (membership !== null) {
        notifyTeamStatusChanged(app, membership.team_id);
    }
}
