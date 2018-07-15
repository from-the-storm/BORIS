import * as postgres from 'pg';
import * as pgPromise from 'pg-promise';

import {config, environment} from '../config';
import {migrate} from './migrate';
import { getRedisClient, wrapRedis } from './redisClient';


const metaDb = pgPromise()({
    host: config.db_host,
    port: config.db_port,
    database: 'postgres',//config.db_name,
    user: config.db_user,
    password: config.db_password,
});

export async function resetTestDB() {
    console.log(`Resetting redis cache`)
    const redisClient = getRedisClient();
    const keys = await wrapRedis(cb => redisClient.keys(`${config.redis_prefix}*`, cb)) as any[];
    for (const key of keys) {
        const unprefixedKey = key.substr(config.redis_prefix.length);
        await wrapRedis(cb => redisClient.del(unprefixedKey, cb));
    }
    await wrapRedis(cb => redisClient.quit(cb));
    console.log(`Resetting test database ${config.db_name}`)
    await metaDb.none(`DROP DATABASE IF EXISTS ${config.db_name}`);
    await metaDb.none(`CREATE DATABASE ${config.db_name}`);
    metaDb.$pool.end();
    console.log('Applying migrations to test DB');
    await migrate();
    console.log('Done preparing test DB');
}

if (require.main === module) { // If running as a script (called directly)
    if (environment !== 'test' && environment !== 'development') {
        throw new Error("This reset script should only be used on a test database");
    }
    resetTestDB();
}
