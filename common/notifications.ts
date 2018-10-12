import { OtherTeamMember } from "./models";
import { AnyUiState } from "./game";
import { GameDetailedStatus, GetTeamMarketVarsResponse } from "./api";

/**
 * The types of notifications that can be sent over the websocket connection
 */
export enum NotificationType {
    TEAM_CHANGED = 'TC',
    MARKET_STATUS_CHANGED = 'MSC',
    GAME_UI_UPDATE = 'GUU',
    GAME_STATUS_CHANGED = 'GSC',
    GAME_ERROR = 'GE',
}

/**
 * This notification is sent when someone joins/leaves the team, goes online/offline, or becomes admin/non-admin
 */
export interface TeamChangedNotification {
    type: NotificationType.TEAM_CHANGED;
    teamMembers: OtherTeamMember[];
}

export interface MarketStatusChanged extends GetTeamMarketVarsResponse {
    type: NotificationType.MARKET_STATUS_CHANGED;
}

export interface GameStatusChangedNotification extends GameDetailedStatus {
    type: NotificationType.GAME_STATUS_CHANGED;
}

/**
 * This notification is sent when a UI step has changed in the game UI
 */
export interface GameUiChangedNotification {
    type: NotificationType.GAME_UI_UPDATE;
    /** This number gets increased by 1 with each UI notification, to ensure none get missed. */
    uiUpdateSeqId: number;
    /** Which step was changed (by index, not by ID) */
    stepIndex: number;
    /** The new UI state for the step that changed. */
    newStepUi: AnyUiState;
}

/**
 * This notification is sent when a UI step has changed in the game UI
 */
export interface GameErrorNotification {
    type: NotificationType.GAME_ERROR;
    friendlyErrorMessage: string;
    debuggingInfoForConsole: any;
}

export type AnyNotification = (
    |TeamChangedNotification
    |MarketStatusChanged
    |GameStatusChangedNotification
    |GameUiChangedNotification
    |GameErrorNotification
);
