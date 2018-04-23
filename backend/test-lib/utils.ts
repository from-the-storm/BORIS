import { CookieJar, RequestAPI } from 'request';
import * as request from 'request-promise-native';
import * as WebSocket from 'ws';
import Client from 'jsonrpc-websocket-client';

import { ApiErrorResponse, ApiMethod, REGISTER_USER, RegisterUserRequest, REQUEST_LOGIN } from '../../common/api';
import { app, startServer, stopServer } from '../backend-app';
import { Server } from 'http';
import { Gender } from '../../common/models';

export class TestServer {
    readonly app: typeof app;
    port: number;
    server: Server;
    private readyPromise: Promise<{}>;

    constructor() {
        this.app = app;
        this.port = 4445;
        this.readyPromise = new Promise((resolve) => {
            const tryNextPort = () => {
                this.port++;
                if (this.port > 4500) {
                    return;
                }
                startServer({port: this.port}).then(resolve, tryNextPort);
            }
            tryNextPort();
        });
    }
    ready(): Promise<{}> { return this.readyPromise; }
    close(): Promise<void> {
        return stopServer();
    }
}



/**
 * An HTTP + websocket client for testing BORIS.
 */
export class TestClient {
    readonly httpClient: typeof request;
    readonly cookieJar: CookieJar;
    readonly server: TestServer;

    constructor(server: TestServer) {
        this.cookieJar = request.jar();
        this.httpClient = request.defaults({
            baseUrl: `http://localhost:${server.port}/`,
            jar: this.cookieJar,
            resolveWithFullResponse: true,
        });
        this.server = server;
    }

    async callApi<RequestType, ResponseType>(method: ApiMethod<RequestType, ResponseType>, data: RequestType): Promise<ResponseType> {
        let response: request.FullResponse;
        let body: ResponseType;
        if (method.type === 'POST') {
            response = await this.httpClient.post(method.path, {json: data});
            body = response.body;
        } else if (method.type === 'GET') {
            const paramsStr = Object.keys(data).map(k => encodeURIComponent(k) + '=' + encodeURIComponent((data as any)[k])).join('&');
            response = await this.httpClient.get(method.path + (paramsStr ? `?${paramsStr}` : ''), {});
            body = JSON.parse(response.body);
        }
        return body;
    }

    async registerUser() {
        const userData: RegisterUserRequest = {
            hasConsented: true,
            firstName: "Jamie",
            email: Math.random().toString(36).slice(-7) + '@test.none',
            workInTech: 'yes',
            occupation: "Tester",
            age: 30,
            gender: Gender.Male,
        };
        await this.callApi(REGISTER_USER, userData);
        return userData;
    }
    async registerAndLogin() {
        const userData = await this.registerUser();
        await this.callApi(REQUEST_LOGIN, {email: userData.email});

        const transport: any = app.get('mailTransport');
        const mailWithLink = transport.sentMail.filter((mail: any) => mail.data.to === userData.email)[0];
        const mailText: string = mailWithLink.data.text;
        const code = mailText.match(/login\/(.*)$/)[1]
        await this.httpClient.get(`/auth/login/${code}`);
        return userData;
    }
    /** Open an RPC Client connection to the server. You must close this afterward with client.close() */
    async openWebsocket(): Promise<any> {
        const cookieString = this.cookieJar.getCookieString(`http://localhost:${this.server.port}/`);
        const rpcClient = new Client({
            url: `ws://localhost:${this.server.port}/rpc`,
            headers: { 'Cookie': cookieString, },
        });
        return new Promise((resolve, reject) => {
            rpcClient.once('notification', (notification: any) => {
                if (notification.method === 'connection_ready') {
                    resolve(rpcClient);
                }
            });
            rpcClient.once('error', () => { reject(); });
            rpcClient.open();
        });
    }
}
