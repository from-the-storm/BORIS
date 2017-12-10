import * as express from 'express';
import * as WebSocket from 'ws';

// Declare our additions to the Express API:
declare global {
    namespace Express {
        interface Request {
            // Passport.js extensions:
            login: (user: any, callback: (err: any) => void) => void;
            logout: () => void;
            user: {
                first_name: string,
            };
        }
        interface Response { }
        interface Application {
            ws: (path: string, handler: (ws: WebSocket, req: Express.Request) => void) => void;
        }
    }
}
