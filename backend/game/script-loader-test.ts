import 'jest';

import { loadScriptFile } from './script-loader';

describe("Script Loader tests", () => {

    describe("loadScriptFile()", async () => {
        it("can load a script from a file", async () => {
            const script = await loadScriptFile("test-script2");
            expect(Array.isArray(script)).toBe(true);
            expect(script.length).toBe(1);
            expect(script[0]).toEqual({
                "step": "message",
                "message": "Hello! This is a message from the second script file.",
            });
        });
        it("can load a script from multiple files using includes", async () => {
            const script = await loadScriptFile("test-script");
            expect(Array.isArray(script)).toBe(true);
            expect(script.length).toBe(2);
            expect(script[0]).toEqual({
                "step": "message",
                "message": "Hello! This is a test.",
            });
            expect(script[1]).toEqual({
                "step": "message",
                "message": "Hello! This is a message from the second script file.",
            });
        });
        it("throws an error if the script doesn't exist", async () => {
            const loadPromise = loadScriptFile("nonexistent-script");
            await expect(loadPromise).rejects.toHaveProperty('message', "Script \"nonexistent-script\" not found.");
        });
        it("won't load files from other directories", async () => {
            const loadPromise = loadScriptFile("../scripts/test-script");
            await expect(loadPromise).rejects.toBeInstanceOf(Error);
        });
    });

});
