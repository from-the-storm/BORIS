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
    type: 'POST'|'GET'|'PUT'|'DELETE';
}

///////////////////////////////////////////////////////////////////////////////
// app-api methods:

export interface GameDetailedStatus {
    gameId: number|null; // ID of the game in question
    isActive: boolean;
    isFinished: boolean; // If isActive is false and this is true, that means the team completed the scenario
                         // If isActive is true and this is false, that means the team abandoned the scenario
    scenarioId?: number; // Only set if isActive is true
    scenarioName?: string; // Only set if isActive is true
}

export interface TeamStatus {
    teamName: string;
    teamCode: string;
    isTeamAdmin: boolean;
    otherTeamMembers: Array<OtherTeamMember>;
};

/** GET_INITIAL_STATE response */
export interface InitialStateResponse {
    user?: {
        id: number;
        first_name: string;
    };
    team?: TeamStatus;
    game?: GameDetailedStatus;
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
export const CREATE_TEAM: ApiMethod<CreateTeamRequest, TeamStatus> = {path: '/auth/team/create', type: 'POST'};

// Join a team:

/** JOIN_TEAM Request */
export interface JoinTeamRequest {
    code: string;
}

export const JOIN_TEAM: ApiMethod<JoinTeamRequest, TeamStatus> = {path: '/auth/team/join', type: 'POST'};

// Leave a team:

export const LEAVE_TEAM: ApiMethod<NoRequestParameters, EmptyApiResponse> = {path: '/auth/team/leave', type: 'POST'};

// Kick a user off a team:

export const KICK_OFF_TEAM: ApiMethod<{teamMemberId: number}, EmptyApiResponse> = {path: '/auth/team/kick', type: 'POST'};


///////////////////////////////////////////////////////////////////////////////
// lobby-api methods:

export interface ScenariosResponse {
    scenarios: Scenario[],
}

export const GET_SCENARIOS: ApiMethod<NoRequestParameters, ScenariosResponse> = {path: '/api/lobby/scenarios', type: 'GET'};

export interface LeaderboardEntry {
    teamName: string;
    organization: string;
    scenariosCompleted: number;
    score: number;
    rank: number;
}

export interface LeaderboardsResponse {
    leaders: LeaderboardEntry[],
}

export const GET_LEADERS: ApiMethod<NoRequestParameters, LeaderboardsResponse> = {path: '/api/lobby/leaderboards', type: 'GET'};


///////////////////////////////////////////////////////////////////////////////
// game-api methods:

/** START_GAME Request */
export interface StartGameRequest {
    scenarioId: number;
}
export const START_GAME: ApiMethod<StartGameRequest, GameDetailedStatus> = {path: '/api/game/start', type: 'POST'};

export interface GetUiStateRequest {
    gameId?: string; // As a GET parameter it becomes a string
}

/** GET_UI_STATE Request */
export interface GetUiStateResponse {
    gameStatus: GameDetailedStatus;
    uiUpdateSeqId: number;
    state: AnyUiState[];
}
export const GET_UI_STATE: ApiMethod<GetUiStateRequest, GetUiStateResponse> = {path: '/api/game/ui', type: 'GET'};

export const ABANDON_GAME: ApiMethod<NoRequestParameters, EmptyApiResponse> = {path: '/api/game/quit', type: 'POST'};

/** 
 * STEP_RESPONSE Request: A player is submitting some kind of response to a "step" in the script.
 * For example, selecitng a choice from a multiple choice prompt.
 **/
interface BaseStepResponseRequest {
    stepId: number;
}
export interface FreeResponseStepResponseRequest extends BaseStepResponseRequest {
    value: string;
}
export interface MultipleChoiceStepResponseRequest extends BaseStepResponseRequest {
    choiceId: string;
}
export type StepResponseRequest = (
    |FreeResponseStepResponseRequest
    |MultipleChoiceStepResponseRequest
);
export const STEP_RESPONSE: ApiMethod<StepResponseRequest, EmptyApiResponse> = {path: '/api/game/step', type: 'POST'};


///////////////////////////////////////////////////////////////////////////////
// market-api methods:


/** GET_TEAM_MARKET_VARS Request: Get some data that affects the market */
export const enum MarketStatus {
    Hidden = 'H', // The team has not completed any scenarios yet so won't see any sign of the market
    Open = 'O', // The market is open and the current player may go buy a punchcard if they wish to
    AlreadyBought = 'A', // The player is the burdened and has _just_ purchased a punchard
    Taped = 'T', // The player is not the burdened so cannot enter the market
};

export interface GetTeamMarketVarsResponse {
    saltinesBalance: number;
    saltinesEarnedAllTime: number;
    status: MarketStatus;
}
export const GET_TEAM_MARKET_VARS: ApiMethod<NoRequestParameters, GetTeamMarketVarsResponse> = {path: '/api/market/gtmv', type: 'GET'};

/** Buy a punchcard */
export interface BuyPunchcardRequest {
    punchcardId: string;
}
export const BUY_PUNCHCARD: ApiMethod<BuyPunchcardRequest, GetTeamMarketVarsResponse> = {path: '/api/market/buy', type: 'POST'};
