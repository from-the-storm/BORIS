import { Scenario, OtherTeamMember, Gender } from "./models";
import { AnyUiState } from "./game";

/** Default return value of API methods that don't return any useful data */
export interface EmptyApiResponse {
    result: 'ok';
}

/** Default parameters value of API methods that don't require any request data */
export interface NoRequestParameters {
}

export interface ApiErrorResponse {
    error: string;
}

export interface ApiMethod<RequestType, ResponseType> {
    path: string;
    type: 'POST'|'GET';
}

///////////////////////////////////////////////////////////////////////////////
// app-api methods:

export interface GameStatus {
    scenarioId: number;
    scenarioName: string;
    isActive: boolean;
}

/** GET_INITIAL_STATE response */
export interface InitialStateResponse {
    user?: {
        id: number;
        first_name: string;
    };
    team?: {
        code: string;
        name: string;
        isTeamAdmin: boolean;
        otherTeamMembers: Array<OtherTeamMember>;
    };
    game?: GameStatus;
};

export const GET_INITIAL_STATE: ApiMethod<{}, InitialStateResponse> = {path: '/api/app/get-initial-state', type: 'GET'};


///////////////////////////////////////////////////////////////////////////////
// login-register methods:

// Request login:

/** REQUEST_LOGIN Request */
export interface RequestLoginRequest {
    email: string;
}

export const REQUEST_LOGIN: ApiMethod<RequestLoginRequest, EmptyApiResponse> = {path: '/auth/request-login', type: 'POST'};

// Register:

export interface RegisterUserRequest {
    hasConsented: boolean;
    firstName: string;
    email: string;
    workInTech: 'yes'|'no';
    occupation: string;
    age: number;
    gender: Gender;
}

export const REGISTER_USER: ApiMethod<RegisterUserRequest, EmptyApiResponse> = {path: '/auth/register', type: 'POST'};

// Create a team:

/** CREATE_TEAM Request */
export interface CreateTeamRequest {
    teamName: string;
    organizationName: string;
}

/** CREATE_TEAM and JOIN_TEAM Response */
export interface CreateOrJoinTeamResponse {
    teamName: string;
    teamCode: string;
    isTeamAdmin: boolean;
    otherTeamMembers: Array<OtherTeamMember>;
};

export const CREATE_TEAM: ApiMethod<CreateTeamRequest, CreateOrJoinTeamResponse> = {path: '/auth/team/create', type: 'POST'};

// Join a team:

/** JOIN_TEAM Request */
export interface JoinTeamRequest {
    code: string;
}

export const JOIN_TEAM: ApiMethod<JoinTeamRequest, CreateOrJoinTeamResponse> = {path: '/auth/team/join', type: 'POST'};

// Leave a team:

export const LEAVE_TEAM: ApiMethod<NoRequestParameters, EmptyApiResponse> = {path: '/auth/team/leave', type: 'POST'};


///////////////////////////////////////////////////////////////////////////////
// lobby-api methods:

export interface ScenariosResponse {
    scenarios: Scenario[],
}

export const GET_SCENARIOS: ApiMethod<NoRequestParameters, ScenariosResponse> = {path: '/api/lobby/scenarios', type: 'GET'};


///////////////////////////////////////////////////////////////////////////////
// game-api methods:

/** START_GAME Request */
export interface StartGameRequest {
    scenarioId: number;
}
export const START_GAME: ApiMethod<StartGameRequest, GameStatus> = {path: '/api/game/start', type: 'POST'};

/** GET_UI_STATE Request */
export interface GetUiStateResponse {
    uiUpdateSeqId: number;
    state: AnyUiState[];
}
export const GET_UI_STATE: ApiMethod<NoRequestParameters, GetUiStateResponse> = {path: '/api/game/ui', type: 'GET'};

export const ABANDON_GAME: ApiMethod<NoRequestParameters, EmptyApiResponse> = {path: '/api/game/quit', type: 'POST'};

/** 
 * STEP_RESPONSE Request: A player is submitting some kind of response to a "step" in the script.
 * For example, selecitng a choice from a multiple choice prompt.
 **/
interface BaseStepResponseRequest {
    stepId: number;
}
export interface MultipleChoiceStepResponseRequest extends BaseStepResponseRequest {
    choiceId: string;
}
export type StepResponseRequest = (
    |MultipleChoiceStepResponseRequest
);
export const STEP_RESPONSE: ApiMethod<StepResponseRequest, EmptyApiResponse> = {path: '/api/game/step', type: 'POST'};
