import 'jest';

import { loadScript } from './script-loader';
import { BorisDatabase, getDB } from '../db/db';

describe("Script Loader tests", () => {
    let db: BorisDatabase;
    beforeAll(async () => { db = await getDB(); });
    afterAll(async () => { await db.instance.$pool.end(); });

    describe("loadScript()", async () => {
        it("can load a script from a file", async () => {
            const script = await loadScript(db, "test-script2");
            expect(Array.isArray(script)).toBe(true);
            expect(script.length).toBe(1);
            expect(script[0]).toEqual({
                "step": "choice",
                "key": "chooseXtoEndGame",
                "choices": [{x: "Done"}],
            });
        });
        it("can load a script from multiple files using includes", async () => {
            const script = await loadScript(db, "test-script");
            expect(Array.isArray(script)).toBe(true);
            expect(script.length).toBe(2);
            expect(script[0]).toEqual({
                "step": "message",
                "messages": ["Hello! This is a test."],
            });
            expect(script[1]).toEqual({
                "step": "choice",
                "key": "chooseXtoEndGame",
                "choices": [{x: "Done"}],
            });
        });
        it("throws an error if the script doesn't exist", async () => {
            const loadPromise = loadScript(db, "nonexistent-script");
            await expect(loadPromise).rejects.toHaveProperty('message', "Script \"nonexistent-script\" not found.");
        });
        it("won't load files from other directories", async () => {
            const loadPromise = loadScript(db, "../scripts/test-script");
            await expect(loadPromise).rejects.toBeInstanceOf(Error);
        });
    });

});
