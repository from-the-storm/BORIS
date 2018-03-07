/** Default return value of API methods that don't return any useful data */
export interface EmptyApiResponse {
    result: 'ok';
}

export interface OtherTeamMember {
    name: string;
    id: number;
    online: boolean;
    isAdmin: boolean;
}

/**
 * Response from /get-initial-state
 */
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


export interface ApiErrorResponse {
    error: string;
}

export interface PostApiMethod<RequestType, ResponseType> {
    path: string;
}

///////////////////////////////////////////////////////////////////////////////
// login-register methods:

// Request login:

/** REQUEST_LOGIN Request */
export interface RequestLoginRequest {
    email: string;
}

export const REQUEST_LOGIN: PostApiMethod<RequestLoginRequest, EmptyApiResponse> = {path: '/auth/request-login'};

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

export const REGISTER_USER: PostApiMethod<RegisterUserRequest, EmptyApiResponse> = {path: '/auth/register'};

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

export const CREATE_TEAM: PostApiMethod<CreateTeamRequest, CreateOrJoinTeamResponse> = {path: '/auth/team/create'};

// Join a team:

/** JOIN_TEAM Request */
export interface JoinTeamRequest {
    code: string;
}

export const JOIN_TEAM: PostApiMethod<JoinTeamRequest, CreateOrJoinTeamResponse> = {path: '/auth/team/join'};

// Leave a team:

export const LEAVE_TEAM: PostApiMethod<{}, EmptyApiResponse> = {path: '/auth/team/leave'};

