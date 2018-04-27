import { OtherTeamMember } from "./models";

/**
 * The types of notifications that can be sent over the websocket connection
 */
export enum NotificationType {
    TEAM_CHANGED = 'TEAM_CHANGED',
    GAME_EVENT = 'GAME_EVENT',
}

/**
 * This notification is sent when someone joins/leaves the team, goes online/offline, or becomes admin/non-admin
 */
export interface TeamChangedNotification {
    teamMembers: OtherTeamMember[];
}
