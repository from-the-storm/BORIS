import { GameVar } from "./vars";

export const enum GameStatus {
    InProgress,
    InReview, // The team has passed the "finish" line in the script and is in the post-scenario review.
              // This status is not saved to the database; it is only remembered in memory and will be
              // lost when the server restarts. Likewise, each connected user tracks this status on their
              // own; the server doesn't track whether or not any given user is done reviewing the game.
    Abandoned,
    Complete,
}

/** 
 * The interface for GameManager that is used by Step subclasses.
 * We define an interface so we can mock it for tests, and to ensure
 * steps only call a limited API.
 **/
export interface GameManagerStepInterface {
    pushUiUpdate(stepId: number): Promise<void>;
    getVar<T>(variable: Readonly<GameVar<T>>, stepId?: number): T;
    setVar<T>(variable: Readonly<GameVar<T>>, updater: (value: T) => T, stepId?: number): Promise<T>;
    safeEvalScriptExpression(jsExpression: string): any;
    readonly playerIds: number[];
    readonly status: GameStatus;
}
