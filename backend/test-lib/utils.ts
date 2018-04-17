import { CookieJar, RequestAPI } from 'request';
import * as request from 'request-promise-native';
import { ApiErrorResponse, ApiMethod, REGISTER_USER, RegisterUserRequest, REQUEST_LOGIN } from '../../common/api';
import { app, startServer, stopServer } from '../backend-app';
import { Server } from 'http';
import { Gender } from '../../common/models';

let lastTestServerPort = 4445;

export class TestServer {
    readonly app: typeof app;
    readonly port: number;
    server: Server;
    private readyPromise: Promise<{}>;

    constructor() {
        this.app = app;
        this.port = lastTestServerPort++;
        this.readyPromise = new Promise((resolve) => { 
            startServer({port: this.port}).then((server) => {
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

    constructor(server: TestServer) {
        this.cookieJar = request.jar();
        this.httpClient = request.defaults({
            baseUrl: `http://localhost:${server.port}/`,
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
}
