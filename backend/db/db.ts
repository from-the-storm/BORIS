import * as massive from 'massive';
import * as postgres from 'pg';
import * as pgPromise from 'pg-promise';

import {config} from '../config';
import { User, DBScenario, Team, Game, Script } from './models';

export interface BorisDatabase extends massive.Database {
    users: massive.Table<User>;
    admin_users: massive.Table<{user_id: number}>;
    login_requests: massive.Table<{
        code: string;
        user_id: number;
        created: Date;
    }>;
    teams: massive.Table<Team>;
    team_members: massive.Table<{
        id: number;
        user_id: number;
        team_id: number;
        is_admin: boolean;
        is_active: boolean;
    }>;
    scenarios: massive.Table<DBScenario>;
    scripts: massive.Table<Script>;

    games: massive.Table<Game>;
    user_by_email(email: string): Promise<User>;
    instance: pgPromise.IDatabase<{}>;
}

// Load 64-bit types as JavaScript integers; we know this would cause issues if we had values
// greater than Number.MAX_SAFE_INTEGER, but we don't expect that case.
postgres.types.setTypeParser(20, val => parseInt(val));

let db: Promise<BorisDatabase>;

/**
 * getDB: Get the database, as a promise returning the Massive.js DB
 */
export function getDB() {
    if (db === undefined) {
        db = massive(
            {
                host: config.db_host,
                port: config.db_port,
                database: config.db_name,
                user: config.db_user,
                password: config.db_password,
            },
            {
                scripts: `do-not-load-scripts`,
                enhancedFunctions: true,
            }
        ) as any as Promise<BorisDatabase>;
    }
    return db;
}
