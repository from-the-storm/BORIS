import {promisify} from "util";
import * as fs from "fs";
import * as yaml from "js-yaml";
import { BorisDatabase } from "../db/db";

const readFileAsync = promisify(fs.readFile);


export async function loadScript(db: BorisDatabase, scriptName: string) {
    const script = await db.scripts.findOne({name: scriptName});
    if (script === null) {
        throw new Error(`Script "${scriptName}" not found.`);
    }
    let parsedData: any;
    try {
        parsedData = yaml.safeLoad(script.script_yaml);
    } catch (err) {
        console.error(`Error when parsing script "${scriptName}":\n\n${err.message}`);
        throw new Error(`Error when parsing script "${scriptName}".`);
    }
    if (!Array.isArray(parsedData)) {
        throw new Error(`Script ${scriptName} format is invalid. Expected root object to be an array.`);
    }
    // Now generate our result by collecting each entry in the script file, and recursively
    // loading any 'include: otherFile' entries.
    const result: any[] = [];
    for (const entry of parsedData) {
        if (typeof entry !== 'object' || Array.isArray(entry)) {
            console.error("This step's format is invalid: \n" + yaml.dump(entry));
            throw new Error("Encountered a step with invalid format");
        }
        // If the entry is like '- include: otherScript' then merge that script
        // into this one.
        if ('include' in entry) {
            if (Object.keys(entry).length !== 1) {
                throw new Error("Unexpected 'include' keyword in step.");
            }
            const includedScriptEntries = await loadScript(db, entry.include);
            Array.prototype.push.apply(result, includedScriptEntries);
        } else {
            result.push(entry);
        }
    }
    return result;
}
