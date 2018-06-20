// Scripts/steps store state using 'game vars':
export const enum GameVarScope {
    Team, // Scoped to this team and lasts across all scenarios. e.g. # of saltines earned
    Game, // Scoped to this game - only applies to this scenario
    Step, // Scope to this step of this game only
}

export interface GameVar<T> {
    readonly key: string;
    readonly scope: GameVarScope;
    readonly default: T;
}
