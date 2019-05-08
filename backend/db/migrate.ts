import * as fs from 'fs';
import * as path from 'path';
import {promisify} from 'util';

const readFileAsync = promisify(fs.readFile);

import {environment} from '../config';
import {getDB} from './db';

export async function migrate() {
    try {
        const db = await getDB();

        console.log("Checking migration history");
        await db.instance.none("CREATE TABLE IF NOT EXISTS __migrations (migration_id TEXT PRIMARY KEY);");

        console.log("Applying main migrations");
        const migrations = [
            '001-initial-up',
            '002-admin-users',
            '003-scripts',
            '004-scenario-city',
            '005-scenario-order',
        ];
        for (const migrationId of migrations) {
            const filePath = path.join(__dirname, 'schema', `${migrationId}.sql`);
            const sql = await readFileAsync(filePath, {encoding: 'utf-8'});
            const result = await db.instance.oneOrNone("SELECT 1 FROM __migrations WHERE migration_id = $1;", [migrationId]);
            if (result !== null) {
                continue; // This migration is already applied
            }
            // Apply this migration
            await db.instance.tx(migrationId, async (task) => {
                await task.none(sql);
                await task.none("INSERT INTO __migrations (migration_id) VALUES ($1);", [migrationId]);
            });
            console.log(` -> ${migrationId} applied`);
        }
        console.log(" -> done");
        
        const loadFixture = async (fixtureName: string) => {
            const dataFilePath = path.join(__dirname, 'schema', fixtureName);
            const devDataSql = await readFileAsync(dataFilePath, {encoding: 'utf-8'});
            await db.query(devDataSql, [], {});
        }
        if (environment === 'development') {
            console.log("Inserting default data for development");
            await loadFixture('dev-data.sql');
            console.log(" -> done");
        } else if (environment === 'test') {
            console.log("Loading test data fixtures");
            await loadFixture('test-data.sql');
            await loadFixture('integration-data.sql');
            console.log(" -> done");
        }
        db.instance.$pool.end();
    } catch(e) {
        console.error(`Failed: ${e.message}`);
    }
}


if (require.main === module) { // If running as a script (called directly)
    migrate().then(() => {
        process.exit();
    }, () => {
        process.exit(1);
    })
}
