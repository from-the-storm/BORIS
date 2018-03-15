export enum LoadingState {
    // Not loaded nor is loading in progress
    NOT_LOADING,
    // Not loaded, but loading is in progress
    LOADING,
    // Fully loaded and ready
    READY,
    // An error occurred
    FAILED,
}
