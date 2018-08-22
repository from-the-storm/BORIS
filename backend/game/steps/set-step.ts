import { StepType } from "../../../common/game";
import { Step } from "../step";
import { SafeError } from "../../routes/api-utils";
import { GameVarScope, GameVar } from "../vars";

/**
 * Set Variable Step: Sets a team or game-scoped variable.
 * 
 * Example:
 * - step: set
 *   key: story
 *   scope: team
 *   to: VAR('story', 0) + 1
 */
export class SetVariableStep extends Step {
    public static readonly stepType: StepType = StepType.Internal;
    public static readonly hasRun: GameVar<boolean> = {key: 'hasRun', scope: GameVarScope.Step, default: false};
    readonly settings: {
        key: string,
        scope: 'team'|'game',
        to: string,
    };

    async run() {
        const gameVar: GameVar<any> = {
            key: this.settings.key,
            scope: this.settings.scope === 'game' ? GameVarScope.Game : GameVarScope.Team,
            default: undefined
        };
        await this.setVar(gameVar, (oldVal) => this.safeEvalScriptExpression(this.settings.to));
        await this.setVar(SetVariableStep.hasRun, true);
    }

    protected parseConfig(config: any): any {
        if (typeof config.key !== 'string') {
            throw new SafeError(`A 'set' step must have a 'key' parameter specifying the variable name.`);
        }
        if (typeof config.to !== 'string') {
            throw new SafeError(`A 'set' step must have a 'to' parameter specifying the value expression.`);
        }
        if (config.scope !== 'team' && config.scope !== 'game') {
            throw new SafeError(`A 'set' step must have 'scope' key set to either 'game' or 'team'.`);
        }
        return config;
    }

    getUiState(): null {
        return null;
    }

    public get isComplete() {
        return this.getVar(SetVariableStep.hasRun);
    }
}
