// Fixes so TypeScript won't complain about importing images for webpack use
declare module '*.png' {
    const value: string;
    export = value;
}
declare module '*.jpg' {
    const value: string;
    export = value;
}
declare module '*.jpeg' {
    const value: string;
    export = value;
}
declare module '*.svg' {
    const value: string;
    export = value;
}