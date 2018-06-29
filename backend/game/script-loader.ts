import * as yaml from "js-yaml";
import { BorisDatabase } from "../db/db";
import { loadStepFromData } from "./steps/loader";
import { VoidGameManager } from "./manager";


/**
 * Load a script by name. Loads from the database unless a YAML string is passed.
 * Parses and evaluates 'include' directives, but doesn't actually validate or
 * parse/load the normal script steps.
 * @param db The database
 * @param scriptName The name of the script to load
 * @param scriptYamlString If a script YAML string is passed, use that instead of loading from the DB
 */
async function _loadScript(db: BorisDatabase, scriptName: string, scriptYamlString?: string) {
    if (scriptYamlString === undefined) {
        const script = await db.scripts.findOne({name: scriptName});
        if (script === null) {
            throw new Error(`Script "${scriptName}" not found.`);
        }
        scriptYamlString = script.script_yaml;
    }
    let parsedData: any;
    try {
        parsedData = yaml.safeLoad(scriptYamlString);
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

/**
 * Load a script by name.
 * Parses and evaluates 'include' directives, but doesn't actually validate or
 * parse/load the normal script steps.
 * @param db The database
 * @param scriptName The name of the script to load
 */
export async function loadScript(db: BorisDatabase, scriptName: string) {
    return await _loadScript(db, scriptName);
}

/**
 * Validate that a script is valid.
 * Will do nothing if the script is valid or raise a SafeError if
 * there are any issues.
 * @param db The database, required to validate 'include' steps
 * @param scriptYamlString The script to validate, as a string in YAML format
 */
export async function validateScriptYaml(db: BorisDatabase, scriptYamlString: string) {
    const scriptData = await _loadScript(db, '_temp', scriptYamlString);
    const gameManager = new VoidGameManager();
    scriptData.forEach((stepData, idx) => {
        const stepId: number = idx * 10; // For now use index*10; in the future, these IDs may be database row IDs etc.
        loadStepFromData(stepData, stepId, gameManager);
    });
}
