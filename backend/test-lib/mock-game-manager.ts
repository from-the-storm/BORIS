import 'jest';
import * as yaml from 'js-yaml';
import { GameManagerStepInterface, GameStatus } from "../game/manager-defs";
import { Step } from '../game/step';
import { GameVarScope, GameVar } from "../game/vars";
import { loadStepFromData } from '../game/steps/loader';

/**
 * A mock for GameManager that can be used for testing steps.
 */
export class MockGameManager implements GameManagerStepInterface {
    playerIds: number[];
    status: GameStatus;
    vars: Map<string, any>;
    constructor() {
        this.vars = new Map();
        this.status = GameStatus.InProgress;
        this.pushUiUpdate = jest.fn();
        this.playerIds = [15, 16, 17, 18, 19]; // 5 mock player IDs
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

    public safeEvalScriptExpression(jsExpression: string) {
        return `MOCK JS RESULT OF: ${jsExpression}`;
    }

    /** A helper method for test cases to use to load Steps from YAML strings */
    static loadStepFromYaml(yamlData: string, manager = new MockGameManager()): Step {
        const data = yaml.safeLoad(yamlData) as any[];
        return loadStepFromData(data[0], 1, manager);
    }
}
