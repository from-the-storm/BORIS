import * as yaml from "js-yaml";
import { BorisDatabase } from "../db/db";
import { loadStepFromData } from "./steps/loader";
import { VoidGameManager } from "./manager";
import { SafeError } from "../routes/api-utils";


let nextIfContextId = 1000;

/**
 * Load a script by name. Loads from the database unless a YAML string is passed.
 * Parses and evaluates 'include' and 'if/elif/else:then:' directives, but doesn't
 * actually validate or parse/load the normal script steps.
 * @param db The database
 * @param scriptName The name of the script to load
 * @param scriptYamlString If a script YAML string is passed, use that instead of loading from the DB
 */
async function _loadScript(db: BorisDatabase, scriptName: string, scriptYamlString?: string) {
    if (scriptYamlString === undefined) {
        const script = await db.scripts.findOne({name: scriptName});
        if (script === null) {
            throw new SafeError(`Script "${scriptName}" not found.`);
        }
        scriptYamlString = script.script_yaml;
    }
    let parsedData: any;
    try {
        parsedData = yaml.safeLoad(scriptYamlString);
    } catch (err) {
        console.error(`Error when parsing script "${scriptName}":\n\n${err.message}`);
        throw new SafeError(`Error when parsing script "${scriptName}".`);
    }
    if (!Array.isArray(parsedData)) {
        console.error(`Script ${scriptName} format is invalid: Expected root object to be an array.`);
        throw new SafeError(`Script ${scriptName} format is invalid.`);
    }
    return _parseEntries(parsedData, db);
}

/**
 * Parses and evaluates 'include' and 'if/elif/else:then:' directives, but doesn't
 * actually validate or parse/load the normal script steps.
 * Returns a single combined array of objects that each represent a Step
 */
async function _parseEntries(stepsData: any[], db: BorisDatabase) {
    // Now generate our result by collecting each entry in the script file, and recursively
    // loading any 'include: otherFile' entries.
    const result: any[] = [];
    let ifThenContextId: number|null = null; // This is a unique ID when we're parsing 'if/elif/else:then:' directives,
                                             // not to be confused with 'if' conditions on individual steps.

    // Call this from anywhere that may be adding steps after an if/elif/else directive.
    // This will inject the important '-step: target, name: endOfContext...' step used
    // by the rewritten if/elif/else directive.
    const endAnyIfThenContext = () => {
        if (ifThenContextId !== null) {
            result.push({step: 'target', name: `endOfContext${ifThenContextId}`});
            ifThenContextId = null;
        }
    }

    for (const entry of stepsData) {
        if (typeof entry !== 'object' || Array.isArray(entry)) {
            console.error("This step's format is invalid: \n" + yaml.dump(entry));
            throw new Error("Encountered a step with invalid format");
        }
        // If the entry is like '- include: otherScript' then merge that script
        // into this one.
        if ('include' in entry) {
            if (Object.keys(entry).length !== 1) {
                throw new SafeError("Unexpected 'include' keyword in step.");
            }
            endAnyIfThenContext();
            const includedScriptEntries = await loadScript(db, entry.include);
            Array.prototype.push.apply(result, includedScriptEntries);
        } else if ('then' in entry) {
            if ('if' in entry) {
                endAnyIfThenContext();
                ifThenContextId = ++nextIfContextId;
            }
            // This is an if/then, elif/then, or else/then directive,
            // which has its own set of indented steps that we'll rewrite into
            // a series of goto/target directives.
            const gotoEndStep = {step: 'goto', name: `endOfContext${ifThenContextId}`};
            const checkNextConditionTarget = {step: 'target', name: `nextCheck${ifThenContextId}`};
            if (Object.keys(entry).length > 2) {
                throw new SafeError('An if directive must have only two keys: "if/elif/else" and "then"');
            }
            if ('if' in entry) {
                // Goto the next elif/else if this evaluates false.
                result.push({step: 'goto', name: checkNextConditionTarget.name, if: `!(${entry.if})`});
                const childSteps = await _parseEntries(entry.then, db);
                Array.prototype.push.apply(result, childSteps);
                result.push(gotoEndStep);
                result.push(checkNextConditionTarget);
            } else if ('elif' in entry) {
                if (ifThenContextId === null) {
                    throw new SafeError("Can't have an 'elif' that's not following an if/then directive.");
                }
                // Goto the next elif/else if this evaluates false.
                result.push({step: 'goto', name: checkNextConditionTarget.name, if: `!(${entry.elif})`});
                const childSteps = await _parseEntries(entry.then, db);
                Array.prototype.push.apply(result, childSteps);
                result.push(gotoEndStep);
                result.push(checkNextConditionTarget);
            } else if ('else' in entry) {
                if (ifThenContextId === null) {
                    throw new SafeError("Can't have an 'else' that's not following an if/then directive.");
                }
                const childSteps = await _parseEntries(entry.then, db);
                Array.prototype.push.apply(result, childSteps);
                endAnyIfThenContext();
            } else {
                throw new SafeError('Invalid keyword combined with "then". Did you mean if/elif/else ?');
            }
        } else {
            endAnyIfThenContext();
            result.push(entry);
        }
    }
    endAnyIfThenContext();
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
 * @param scriptName The script name, used only to render better error messages
 */
export async function validateScriptYaml(db: BorisDatabase, scriptYamlString: string, scriptName: string = '_temp') {
    const scriptData = await _loadScript(db, scriptName, scriptYamlString);
    const gameManager = new VoidGameManager();
    scriptData.forEach((stepData, idx) => {
        const stepId: number = idx * 10; // For now use index*10; in the future, these IDs may be database row IDs etc.
        loadStepFromData(stepData, stepId, gameManager);
    });
}
