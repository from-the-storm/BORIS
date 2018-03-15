import { BaseScenario } from "../../common/models";

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

export interface DBScenario extends BaseScenario {
    is_active: boolean;
    /** Note that X is the latitude and Y is the longitude */
    start_point: {x: number, y: number};
}
