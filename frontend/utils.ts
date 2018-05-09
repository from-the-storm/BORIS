/**
 * 'await' this function to "sleep" for the specified number of milliseconds
 * @param delayMs How long to wait, in mlliseconds
 */
export function sleep (delayMs: number) {
    return new Promise(resolve => setTimeout(resolve, delayMs));
}
