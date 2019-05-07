/**
 * Data models used by both the backend and frontend.
 */

export enum Gender {
    Male = 'm',
    Female = 'f',
    Other = 'o',
    NoAnswer = 'n',
}
export const isValidGender = (value: string) => !!(Object.keys(Gender).find(k => Gender[k as any] === value));

export interface BaseScenario {
    id: number;
    name: string;
    duration_min: number;
    difficulty: 'easy'|'med'|'hard';
    start_point_name: string;
    description_html: string;
    city: string;
    order: number;
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
