import 'jest';

import { loadScript } from './script-loader';
import { BorisDatabase, getDB } from '../db/db';

describe("Script Loader tests", () => {
    let db: BorisDatabase;
    beforeAll(async () => { db = await getDB(); });
    afterAll(async () => { await db.instance.$pool.end(); });

    describe("loadScript()", () => {
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

        describe("Can rewrite an if statement into goto/target directives", () => {

            it("step, if, elif, step", async() => {
                const scriptName = 'can-rewrite-test';
                const ctxID = 1001;
                await db.scripts.insert({name: scriptName, script_yaml: `
                - step: foo
                - if: condition1
                  then:
                    - step: case1a
                      if: foobar
                    - step: case1b
                - elif: condition2
                  then:
                    - step: case2a
                - step: bar
                `});
                const parsedData = await loadScript(db, scriptName);
                expect(parsedData).toEqual([
                    {step: 'foo'},
                    {step: 'goto', if: '!(condition1)', name: `nextCheck${ctxID}`},
                        {step: 'case1a', if: 'foobar'},
                        {step: 'case1b'},
                        {step: 'goto', name: `endOfContext${ctxID}`},
                    {step: 'target', name: `nextCheck${ctxID}`},
                    {step: 'goto', if: '!(condition2)', name: `nextCheck${ctxID}`},
                        {step: 'case2a'},
                        {step: 'goto', name: `endOfContext${ctxID}`},
                    {step: 'target', name: `nextCheck${ctxID}`},
                    {step: 'target', name: `endOfContext${ctxID}`},
                    {step: 'bar'},
                ]);
            });

            it("if, if, else, step", async() => {
                const scriptName = 'can-rewrite-test2';
                const ctxID = 1002;
                const ctxID2 = 1003;
                await db.scripts.insert({name: scriptName, script_yaml: `
                - if: condition1
                  then:
                    - step: case1a
                - if: condition2
                  then:
                    - step: case2a
                - else:
                  then:
                    - step: elsestep
                - step: bar
                `});
                const parsedData = await loadScript(db, scriptName);
                expect(parsedData).toEqual([
                    {step: 'goto', if: '!(condition1)', name: `nextCheck${ctxID}`},
                        {step: 'case1a'},
                        {step: 'goto', name: `endOfContext${ctxID}`},
                    {step: 'target', name: `nextCheck${ctxID}`},
                    {step: 'target', name: `endOfContext${ctxID}`},

                    {step: 'goto', if: '!(condition2)', name: `nextCheck${ctxID2}`},
                        {step: 'case2a'},
                        {step: 'goto', name: `endOfContext${ctxID2}`},
                    {step: 'target', name: `nextCheck${ctxID2}`},
                        {step: 'elsestep'},
                    {step: 'target', name: `endOfContext${ctxID2}`},
                    {step: 'bar'},
                ]);
            });

        });
    });

});
