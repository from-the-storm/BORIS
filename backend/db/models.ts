import { BaseScenario, Scenario, Gender } from "../../common/models";

export interface BasicUser {
    // user without the survey_data fields
    id: number;
    first_name: string;
    email: string;
    created: Date;
}

export interface User extends BasicUser {
    survey_data: {
        hasConsented: boolean,
        workInTech: boolean|null,
        occupation: string,
        age: number|null,
        gender: Gender|null,
    };
}

export interface Team {
    id: number;
    name: string;
    organization: string;
    code: string;
    created: Date;
    game_vars: any;
}

export interface DBScenario extends BaseScenario {
    is_active: boolean;
    /** Script: which .yml file in game/scripts/ to use for this scenario. */
    script: string;
    /** Note that X is the latitude and Y is the longitude */
    start_point: {x: number, y: number};
}

export interface Script {
    name: string;
    script_yaml: string;
}

/**
 * Remove the 'is_active' field and convert start_point to the more useful format
 * @param s A scenario as loaded from the database
 */
export function scenarioFromDbScenario(s: DBScenario): Scenario {
    return {
        id: s.id,
        name: s.name,
        duration_min: s.duration_min,
        difficulty: s.difficulty,
        start_point_name: s.start_point_name,
        description_html: s.description_html,
        start_point: {lat: s.start_point.x, lng: s.start_point.y},
        city: s.city,
        order: s.order,
    };
}

export interface Game {
    id: number;
    team_id: number;
    scenario_id: number;
    started: Date;
    is_active: boolean;
    finished: Date;
    game_vars: any;
    pending_team_vars: any;
}
