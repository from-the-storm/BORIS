import { Scenario } from "../db/models";

/** Default return value of API methods that don't return any useful data */
export interface EmptyApiResponse {
    result: 'ok';
}

/** Default parameters value of API methods that don't require any request data */
export interface NoRequestParameters {
}

export interface OtherTeamMember {
    name: string;
    id: number;
    online: boolean;
    isAdmin: boolean;
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

/** GET_INITIAL_STATE response */
export interface InitialStateResponse {
    user?: {
        first_name: string;
    };
    team?: {
        code: string;
        name: string;
        isTeamAdmin: boolean;
        otherTeamMembers: Array<OtherTeamMember>;
    };
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
    gender: 'm'|'f'|'o';
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
