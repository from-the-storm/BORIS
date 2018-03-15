import {Dispatch} from 'redux';

//// User State Actions

export enum Actions {
    // RS_ prefix means Registration State
    SHOW_HOME = 'RS_HOME',
    SHOW_LOGIN = 'RS_LOGIN',
    SHOW_LOGOUT = 'RS_LOGOUT',
    SHOW_REGISTER = 'RS_REGISTER',
    SHOW_JOIN_TEAM = 'RS_SHOW_JOIN',
    SHOW_CREATE_TEAM = 'RS_SHOW_CREATE',
    SHOW_CHOOSE_SCENARIO = 'RS_SHOW_CHOOSE_SCENARIO',
}

export interface ShowHomeAction { type: Actions.SHOW_HOME; }
export interface ShowLoginAction { type: Actions.SHOW_LOGIN; }
export interface ShowLogoutAction { type: Actions.SHOW_LOGOUT; }
export interface ShowRegisterAction { type: Actions.SHOW_REGISTER; }
export interface ShowJoinTeamAction { type: Actions.SHOW_JOIN_TEAM; }
export interface ShowCreateTeamAction { type: Actions.SHOW_CREATE_TEAM; }
export interface ShowChooseScenarioAction { type: Actions.SHOW_CHOOSE_SCENARIO; }

export type RegistrationStateActionsType = (
    ShowHomeAction|
    ShowLoginAction|
    ShowLogoutAction|
    ShowRegisterAction|
    ShowJoinTeamAction|
    ShowCreateTeamAction|
    ShowChooseScenarioAction
);

//// Action Creators

