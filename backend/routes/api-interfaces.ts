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
