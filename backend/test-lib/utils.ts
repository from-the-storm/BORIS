import { CookieJar, RequestAPI } from 'request';
import * as request from 'request-promise-native';
import { ApiErrorResponse, ApiMethod } from '../../common/api';
import { app, startServer, stopServer } from '../backend-app';
import { Server } from 'http';

export class TestServer {
    readonly app: typeof app;
    server: Server;
    private readyPromise: Promise<{}>;

    constructor() {
        this.app = app;
        this.readyPromise = new Promise((resolve) => { 
            startServer().then((server) => {
                this.server = server;
                resolve();
            });
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

    constructor() {
        this.cookieJar = request.jar();
        this.httpClient = request.defaults({
            baseUrl: 'http://localhost:4444/',
            jar: this.cookieJar,
            resolveWithFullResponse: true,
        });
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
}
