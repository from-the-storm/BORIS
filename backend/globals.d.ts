// Declare default export as explicit 'any' type for packages with no typings:
declare module 'express-ws' {
    var _a: any;
    export = _a;
}
declare module 'nodemailer-sparkpost-transport' {
    var _a: any;
    export = _a;
}
declare module 'nodemailer-mock-transport' {
    var _a: any;
    export = _a;
}
declare module 'passport' {
    // This module has a @types package but it's mostly 'any' defintions, so our express-extended.ts definitions are better
    var _a: any;
    export = _a;
}
declare module 'passport-unique-token' {
    // This module has a @types package but it's mostly 'any' defintions, so our express-extended.ts definitions are better
    var _a: {
        Strategy: any;
    };
    export = _a;
}
declare module 'whiskers' {
    var _a: any;
    export = _a;
}
declare module 'validator/lib/isEmail' {
    const isEmail: (email: string) => boolean;
    export = isEmail;
}
