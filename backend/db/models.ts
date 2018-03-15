export interface User {
    id: number;
    first_name: string;
    email: string;
    created: Date;
    survey_data: {
        hasConsented: boolean,
        workInTech: boolean|null,
        occupation: string,
        age: number|null,
        gender: 'm'|'f'|'o'|null,
    };
}

export interface Scenario {
    id: number;
    is_active: boolean;
    name: string;
    duration_min: number;
    difficulty: 'easy'|'med'|'hard';
    start_point_name: string;
    /** Note that X is the latitude and Y is the longitude */
    start_point: {x: number, y: number};
    description_html: string;
}
