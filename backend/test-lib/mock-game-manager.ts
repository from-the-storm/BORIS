import 'jest';
import * as yaml from 'js-yaml';
import { GameManager, GameManagerStepInterface } from "../game/manager";
import { Step } from '../game/step';
import { GameVarScope, GameVar } from "../game/vars";
import { loadStepFromData } from '../game/steps/loader';

/**
 * A mock for GameManager that can be used for testing steps.
 */
export class MockGameManager implements GameManagerStepInterface {
    vars: Map<string, any>;
    constructor() {
        this.vars = new Map();
        this.pushUiUpdate = jest.fn();
    }
    public async pushUiUpdate(stepId: number) { /* This will get replaced with a Jest mock in the constructor */ }
    private keyForVar(variable: GameVar<any>, stepId?: number): string {
        return String(variable.scope) + (variable.scope === GameVarScope.Step ? stepId : '') + variable.key;
    }
    public getVar<T>(variable: Readonly<GameVar<T>>, stepId?: number): T {
        const value = this.vars.get(this.keyForVar(variable));
        if (value === undefined) {
            return variable.default;
        }
        return value;
    }
    public async setVar<T>(variable: Readonly<GameVar<T>>, updater: (value: T) => T, stepId?: number): Promise<T> {
        const newValue = updater(this.getVar(variable));
        this.vars.set(this.keyForVar(variable), newValue);
        return newValue;
    }

    /** A helper method for test cases to use to load Steps from YAML strings */
    static loadStepFromYaml(yamlData: string): Step {
        const data = yaml.safeLoad(yamlData);
        return loadStepFromData(data[0], 1, new MockGameManager() as any as GameManager);
    }
}
