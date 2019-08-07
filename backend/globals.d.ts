// Declare default export as explicit 'any' type for packages with no typings:
declare module 'express-ws' {
    var _a: any;
    export = _a;
}
declare module 'nodemailer-mailgun-transport' {
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

declare module 'jsonrpc-websocket-client';

declare module 'js-interpreter' {

    type AST = never;

    namespace Interpreter {
        enum _UniqueObjectType{}
        enum _UniqueValueType{}

        type Object = _UniqueObjectType;
        type Value = Interpreter.Object|_UniqueValueType;
        type ValueInput = Interpreter.Value|string|number|boolean|null|undefined;
    }

    class Interpreter {
        /**
         * Create a new interpreter.
         * @param {string|!Object} code Raw JavaScript text or AST.
         * @param {Function=} opt_initFunc Optional initialization function.  Used to
         *     define APIs.  When called it is passed the interpreter object and the
         *     global scope object.
         * @constructor
         */
        constructor(code: string|AST, opt_initFunc: (interpreter: Interpreter, scope: Interpreter.Object) => void);

        /**
         * Execute one step of the interpreter.
         * @return {boolean} True if a step was executed, false if no more instructions.
         */
        step(): boolean;

        /**
         * Execute the interpreter to program completion.  Vulnerable to infinite loops.
         * @return {boolean} True if a execution is asynchronously blocked,
         *     false if no more instructions.
         */
        run(): boolean;
        /**
         * Add more code to the interpreter.
         * @param {string|!Object} code Raw JavaScript text or AST.
         */
        appendCode(code: string|AST): void;

        value: Interpreter.Value;

        /**
         * Create a new data object based on a constructor's prototype.
         * @param {Interpreter.Object} constructor Parent constructor function,
         *     or null if scope object.
         * @return {!Interpreter.Object} New data object.
         */
        createObject(constructor: Interpreter.Object|null): Interpreter.Object;

        /**
         * Create a new data object based on a prototype.
         * @param {Interpreter.Object} proto Prototype object.
         * @return {!Interpreter.Object} New data object.
         */
        createObjectProto(proto: Interpreter.Object): Interpreter.Object;

        /**
         * Create a new native asynchronous function.
         * @param {!Function} asyncFunc JavaScript function.
         * @return {!Interpreter.Object} New function.
         */
        createAsyncFunction(asyncFunc: Function): Interpreter.Object;

        /**
         * Create a new native function.
         * @param {!Function} nativeFunc JavaScript function.
         * @param {boolean=} opt_constructor If true, the function's
         * prototype will have its constructor property set to the function.
         * If false, the function cannot be called as a constructor (e.g. escape).
         * Defaults to undefined.
         * @return {!Interpreter.Object} New function.
         */
        createNativeFunction(nativeFunc: Function, op_constructor?: boolean): Interpreter.Object;

        /**
         * Fetch a property value from a data object.
         * @param {Interpreter.Value} obj Data object.
         * @param {Interpreter.Value} name Name of property.
         * @return {Interpreter.Value} Property value (may be undefined).
         */
        getProperty(obj: Interpreter.Object, name: string): Interpreter.Value;

        /**
         * Set a property value on a data object.
         * @param {!Interpreter.Object} obj Data object.
         * @param {Interpreter.Value} name Name of property.
         * @param {Interpreter.Value} value New property value.
         *     Use Interpreter.VALUE_IN_DESCRIPTOR if value is handled by
         *     descriptor instead.
         * @param {Object=} opt_descriptor Optional descriptor object.
         * @return {!Interpreter.Object|undefined} Returns a setter function if one
         *     needs to be called, otherwise undefined.
         */
        setProperty(obj: Interpreter.Object, name: string, value: Interpreter.Value, opt_descriptor?: any): Interpreter.Object|undefined;

        /**
         * Converts from a JS interpreter object to native JS object.
         * Can handle JSON-style values, plus cycles.
         * @param {Interpreter.Value} pseudoObj The JS interpreter object to be
         * converted.
         * @param {Object=} opt_cycles Cycle detection (used in recursive calls).
         * @return {*} The equivalent native JS object or value.
         */
        pseudoToNative(pseudoObj: Interpreter.Value, opt_cycles?: never): any;

        /**
         * Converts from a native JS object or value to a JS interpreter object.
         * Can handle JSON-style values, does NOT handle cycles.
         * @param {*} nativeObj The native JS object to be converted.
         * @return {Interpreter.Value} The equivalent JS interpreter object.
         */
        nativeToPseudo(nativeObj: any): Interpreter.Value;
    }

    export = Interpreter;
}