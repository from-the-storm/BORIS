/** Default return value of API methods that don't return any useful data */
export interface EmptyApiResponse {
    result: 'ok';
}


/** /request-login request POST body parameters */
export interface RequestLoginRequest {
    email: string;
}
/** /request-login response */
export type RequestLoginResponse = EmptyApiResponse;


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

/** Create Team API POST body data */
export interface CreateTeamRequest {
    teamName: string;
    organizationName: string;
}

/** Join Team API POST body data */
export interface JoinTeamRequest {
    code: string;
}

/**
 * Responses from the join and create team APIs
 */
export interface JoinTeamResponse {
    teamName: string;
    teamCode: string;
    isTeamAdmin: boolean;
    otherTeamMembers: Array<OtherTeamMember>;
};

export interface ApiErrorResponse {
    error: string;
}
