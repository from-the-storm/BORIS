/**
 * Data models used by both the backend and frontend.
 */

export interface BaseScenario {
    id: number;
    name: string;
    duration_min: number;
    difficulty: 'easy'|'med'|'hard';
    start_point_name: string;
    description_html: string;
}

export interface Scenario extends BaseScenario {
    start_point: {lat: number, lng: number};
}

export interface OtherTeamMember {
    name: string;
    id: number;
    online: boolean;
    isAdmin: boolean;
}
