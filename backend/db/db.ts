import * as massive from 'massive';
import * as postgres from 'pg';
import * as pgPromise from 'pg-promise';

import {config} from '../config';

interface User {
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

interface BorisDatabase extends massive.Database {
    users: massive.Table<User>;
    activity: massive.Table<{
        id: number;
        user_id: number;
        event_type: string;
        timestamp: Date;
        details: any;
    }>;
    user_by_email: Promise<User>;
    instance: pgPromise.IDatabase<{}>;
}

// Load 64-bit types as JavaScript integers; we know this would cause issues if we had values
// greater than Number.MAX_SAFE_INTEGER, but we don't expect that case.
postgres.types.setTypeParser(20, val => parseInt(val));

/**
 * getDB: Get the database, as a promise returning the Massive.js DB
 */
export function getDB() {
    return massive(
        {
            host: config.db_host,
            port: config.db_port,
            database: config.db_name,
            user: config.db_user,
            password: config.db_password,
        },
        {
            //scripts: `${__dirname}/scripts`,
            enhancedFunctions: true,
        }
    ) as any as Promise<BorisDatabase>;
}
