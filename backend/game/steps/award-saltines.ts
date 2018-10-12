import { StepType } from "../../../common/game";
import { SafeError } from "../../routes/api-utils";
import { Step } from "../step";
import { GameVar, GameVarScope } from "../vars";
import { getTeamVar, setTeamVar } from "../team-vars";
import { BorisDatabase } from "../../db/db";
import { GameManager } from "../manager";

interface AwardSaltinesStepSettings {
    earned: number,
    possible: number,
};

export const SALTINES_EARNED_ALL_TIME: GameVar<number> = {key: 'saltines', scope: GameVarScope.Team, default: 0};
export const SALTINES_SPENT: GameVar<number> = {key: 'saltines_spent', scope: GameVarScope.Team, default: 0};
export const SALTINES_EARNED_THIS_GAME: GameVar<number> = {key: 'saltines_this_game', scope: GameVarScope.Game, default: 0};
export const SALTINES_POSSIBLE_THIS_GAME: GameVar<number> = {key: 'possible_saltines_this_game', scope: GameVarScope.Game, default: 0};

export async function getSaltinesStatus(teamId: number, db: BorisDatabase) {
    const earned = await getTeamVar(SALTINES_EARNED_ALL_TIME, teamId, db);
    const spent = await getTeamVar(SALTINES_SPENT, teamId, db);
    return {
        balance: earned - spent,
        earned,
        spent,
    }
}

export async function spendSaltines(numSaltinesToSpend: number, teamId: number, db: BorisDatabase) {
    const earned = await getTeamVar(SALTINES_EARNED_ALL_TIME, teamId, db);
    const spent = await getTeamVar(SALTINES_SPENT, teamId, db);
    if (numSaltinesToSpend < 0) {
        throw new Error("Can't spend negative saltines.");
    }
    if ((earned - spent) < numSaltinesToSpend) {
        throw new Error("Insufficient balance.");
    }
    await setTeamVar(SALTINES_SPENT, v => v + numSaltinesToSpend, teamId, db);
    return await getSaltinesStatus(teamId, db);
}

export function getSaltinesEarnedInGame(gameManager: GameManager) {
    const earnedThisGame = gameManager.getVar(SALTINES_EARNED_THIS_GAME);
    const possibleThisGame = gameManager.getVar(SALTINES_POSSIBLE_THIS_GAME);
    return {
        earnedThisGame,
        possibleThisGame,
    }
}

export class AwardSaltinesStep extends Step {
    public static readonly stepType: StepType = StepType.Internal;
    readonly settings: AwardSaltinesStepSettings;
    public static readonly hasRun: GameVar<boolean> = {key: 'hasRun', scope: GameVarScope.Step, default: false};

    async run() {
        await this.setVar(SALTINES_EARNED_ALL_TIME, oldAmount => oldAmount + this.settings.earned);
        await this.setVar(SALTINES_EARNED_THIS_GAME, oldAmount => oldAmount + this.settings.earned);
        await this.setVar(SALTINES_POSSIBLE_THIS_GAME, oldAmount => oldAmount + this.settings.possible);
        await this.setVar(AwardSaltinesStep.hasRun, true);
    }

    protected parseConfig(config: any): AwardSaltinesStepSettings {
        if (typeof config.earned !== 'number') {
            throw new SafeError("Award saltines step must have a numeric 'earned' parameter");
        }
        if (typeof config.possible !== 'number') {
            throw new SafeError("Award saltines step must have a numeric 'possible' parameter");
        }
        if (config.earned > config.possible) {
            throw new SafeError("Earned must be less than or equal to possible.");
        }
        return {
            earned: config.earned,
            possible: config.possible,
        }
    }

    getUiState(): null {
        return null;
    }

    public get isComplete() {
        return this.getVar(AwardSaltinesStep.hasRun);
    }
}
