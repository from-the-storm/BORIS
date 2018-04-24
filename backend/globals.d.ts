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
declare module 'json-rpc-protocol' {
    interface JsonRpcBaseMessage {
        jsonrpc: '1.0'|'2.0';
    }
    interface JsonRpcBaseValidMessage extends JsonRpcBaseMessage {
        method: string;
        params?: any[]|{};
    }
    export interface JsonRpcNotification extends JsonRpcBaseValidMessage {
        type: 'notification';
    }
    export interface JsonRpcRequest extends JsonRpcBaseValidMessage {
        type: 'request';
        id: number|string;
    }
    export interface JsonRpcResponse extends JsonRpcBaseValidMessage {
        type: 'error';
        id: number|string;
    }
    export interface JsonRpcErrorMessage extends JsonRpcBaseMessage {
        type: 'error';
        error: {
            code: number;
            message: string;
        };
        id: null;
    }
    export type JsonRpcMessage = (JsonRpcNotification|JsonRpcRequest|JsonRpcResponse);
    export interface JsonRpcError {
        message: string;
        code: number;
        data: any;
    }
    export interface InvalidJson extends JsonRpcError {}
    export interface InvalidRequest extends JsonRpcError {}
    export interface MethodNotFound extends JsonRpcError {}
    export interface InvalidParameters extends JsonRpcError {}
}
declare module 'json-rpc-peer';
