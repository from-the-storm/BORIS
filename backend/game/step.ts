import { AnyUiState, StepType, GameUserRole } from "../../common/game";
import { GameManager } from "./manager";
import { GameVar, GameVarScope } from "./vars";


const SaltinesVar: GameVar<number> = {key: 'saltines', scope: GameVarScope.Team, default: 0};

interface StepParams {
    id: number;
    manager: GameManager;
    settings: Readonly<any>; // settings that define how this step works (immutable)
}

abstract class Step {
    readonly id: number;
    readonly manager: GameManager;
    readonly settings: any;
    public static readonly stepType: StepType = StepType.Unknown;

    constructor(args: StepParams) {
        this.id = args.id;
        this.manager = args.manager;
    }

    protected getVar<T>(variable: GameVar<T>): T {
        return this.manager.getVar(variable, this.id);
    }
    protected async setVar<T>(variable: GameVar<T>, updater: (val: T) => T): Promise<T> {
        return this.manager.setVar(variable, updater, this.id);
    }

    public abstract getUiState(): AnyUiState;

    /** Push out the updated value of getUiState() to all players */
    private pushUiUpdate() {
        // TODO
    }
}

const ResumeAt: GameVar<Date> = {key: 'resume_at', scope: GameVarScope.Step, default: new Date()};

class MessageStep extends Step {
    public static readonly stepType: StepType = StepType.MessageStep;
    getUiState() {
        const saltines = this.getVar(SaltinesVar);
        return {
            type: StepType.MessageStep,
            message: `this is a test. You have ${saltines} saltines.`,
            forRoles: [GameUserRole.Wayfinder],
        };
    }
}

class FreeResponseStep extends Step {
    public static readonly stepType: StepType = StepType.FreeResponse;
    getUiState() {
        const saltines = this.getVar(SaltinesVar);
        return {
            type: StepType.FreeResponse,
            multiline: false,
        };
    }
}
