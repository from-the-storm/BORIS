import {config, environment} from '../config';
import { getDB } from './db';



export async function resetGames() {
    const db = await getDB();
    await db.games.destroy({});
    console.log(`Reset games in database ${config.db_name}`)
    await db.instance.$pool.end();
}

if (require.main === module) { // If running as a script (called directly)
    if (environment !== 'test' && environment !== 'development') {
        throw new Error("This reset script should only be used on a test database");
    }
    resetGames();
}
