import * as express from 'express';
import * as WebSocket from 'ws';

export interface UserType {
    first_name: string;
    id: number;
}

// Declare our additions to the Express API:
declare global {
    namespace Express {
        interface Request {
            // Passport.js extensions:
            login: (user: any, callback: (err: any) => void) => void;
            logout: () => void;
            user: UserType;
        }
        interface Response { }
        interface Application {
            ws: (path: string, handler: (ws: WebSocket, req: express.Request) => void) => void;
        }
    }
}
