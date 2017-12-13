import * as fs from 'fs';
import * as path from 'path';
import {promisify} from 'util';

const readFileAsync = promisify(fs.readFile);

import {environment} from '../config';
import {getDB} from './db';

async function migrate() {
    try {
        const db = await getDB();

        console.log("Applying main migration");
        const file1path = path.join(__dirname, 'schema', '001-initial-up.sql');
        const sql1 = await readFileAsync(file1path, {encoding: 'utf-8'});
        // Apply main migration:
        await db.instance.none(sql1);
        console.log(" -> done");
        
        if (environment === 'development') {
            console.log("Inserting default data for development");
            const dataFilePath = path.join(__dirname, 'schema', 'dev-data.sql');
            const devDataSql = await readFileAsync(dataFilePath, {encoding: 'utf-8'});
            await db.query(devDataSql, [], {});
            console.log(" -> done");
        }
        process.exit();
    } catch(e) {
        console.error(`Failed: ${e.message}`);
        process.exit(1);
    }
}
migrate();
