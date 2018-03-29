import * as express from 'express';
import * as expressWebsocket from 'express-ws';
import * as bodyParser from 'body-parser';
import JsonRpcPeer from 'json-rpc-peer';
import {MethodNotFound, JsonRpcError, JsonRpcMessage} from 'json-rpc-protocol';
import * as nodemailer from 'nodemailer';
import { SendMailOptions } from 'nodemailer';
import * as nodemailerSparkPostTransport from 'nodemailer-sparkpost-transport';
import * as nodemailerMockTransport from 'nodemailer-mock-transport';
import * as passport from 'passport';
import {Strategy as UniqueTokenStrategy} from 'passport-unique-token';
import * as path from 'path';
import * as redis from 'redis';
import * as session from 'express-session';
import * as connectRedis from 'connect-redis';
import * as whiskers from 'whiskers';

import {environment, config} from './config';
import {getDB, BorisDatabase} from './db/db';
import {router as appAPIRouter} from './routes/app-api';
import {router as loginRegisterRouter} from './routes/login-register';
import {router as lobbyRouter} from './routes/lobby-api';
import {router as testHelperRouter} from './routes/test-helper-api';

// Declare our additions to the Express API:
import {UserType} from './express-extended';

const app = express();
expressWebsocket(app);

// Locals available in any template:
app.locals.resUrl = config.resource_url;

// Logging
const logMessage = console.log;

app.set('trust proxy', true);
app.engine('.txt', whiskers.__express); // Whiskers templates are used for plain text emails
app.set('view engine', 'pug'); // Pug templates are used for everything else
app.set('views', __dirname + '/views');
app.set('view cache', (environment !== 'development')); // Enable view caching in 'test' and 'production' modes
app.set('strict routing', true);
app.set('case sensitive routing', true);

// Set up more secure headers:
app.use((req, res, next) => {
    // Remove Express "powered by" header
    app.disable('x-powered-by');
    // HTTP Strict Transport Security
    res.header('Strict-Transport-Security', 'max-age=5184000; includeSubDomains');
    // Disable MIME type sniffing
    res.header('X-Content-Type-Options', 'nosniff');
    // Don't put us in a box. Prevent clickjacking.
    res.header('X-Frame-Options', 'DENY');
    next();
});

// Misc. Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configure redis and session store:
const RedisStore = connectRedis(session);
const redisClient = redis.createClient({
    host: config.redis_host,
    port: config.redis_port,
    password: config.redis_password,
    prefix: config.redis_prefix,
});
app.set('redisClient', redisClient);
app.use(session({
    store: new RedisStore({client: redisClient, logErrors: true}),
    secret: config.secret_key,
    name: 'boris_sid',
    cookie: {
        httpOnly: true,
        maxAge: 180 * 86400000, // 180 days
        secure: (environment !== 'test' && environment !== 'development'),
    },
    resave: false,
    saveUninitialized: false,
}));

// Database:
const whenDbReady = getDB().then(db => { app.set('db', db); return db; });
app.set('whenDbReady', whenDbReady);

// Email sending:
app.set('sendMail', (function() {
    let transport;
    let logMessage = false;
    if (environment === 'test') {
        transport = nodemailerMockTransport();
        app.set('mailTransport', transport);
    } else if (config.sparkpost_api_key) {
        transport = nodemailerSparkPostTransport({sparkPostApiKey: config.sparkpost_api_key});
    } else {
        // Default: output to stdout only, don't actually send.
        logMessage = true;
        transport = {streamTransport: true, newline: 'unix'};
    }

    const transporter = nodemailer.createTransport(transport);

    // Return a sendMail method, that in turn returns a promise:
    return async (mailData: SendMailOptions) => {
        // The 'from' value is usually the same, so we set it here:
        const mailDataWithDefaults = Object.assign({from: config.system_emails_from}, mailData);
        const info = await transporter.sendMail(mailDataWithDefaults);
        if (logMessage) {
            process.stdout.write("\nEmail sent:\n");
            info.message.pipe(process.stdout);
        }
        return info;
    };
})());

// Configure authentication:
app.use(passport.initialize());
app.use(passport.session());
passport.use(new UniqueTokenStrategy(
    {
        tokenParams: 'code', // Get the token from the 'code' URL field
    },
	(token: string, done: (error: any, user?: any) => void) => {
        const db: BorisDatabase = app.get('db');
        const DAYS = 1000 * 60 * 60 * 24;
        const validAfter = new Date(+new Date() - 7 * DAYS);
        db.login_requests.findOne({code: token, 'created >=': validAfter}).then(async reqData => {
            if (reqData === null) {
                return done(null, null);
            } else {
                const user = await db.users.findOne(reqData.user_id);
                return done(null, user);
            }
        }).catch(err => {
            return done(err);
        });
	}
));

passport.serializeUser((user: UserType, done: any) => { done(null, user.id); });
passport.deserializeUser((id: number, done: any) =>{
    const db = app.get('db');
    db.users.find(id).then((user: UserType) => { done(null, user); }, (err: any) => { done(err, null); });
});

// Configure logging:
app.use((req, res, next) => {
    logMessage(req.method + ' ' + req.url);
    return next();
});

// Remove trailing slashes
app.use((req, res, next) => {
    if (req.path !== '/' && req.path.substr(-1) === '/') {
        res.redirect(req.path.substr(0, req.path.length - 1));
    } else {
        next();
    }
});

////////////////////////////////////////////////////////////////////////////////
// Views:

// Static files:
app.use(config.resource_url, express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// The React single page app:
app.get('/', (req, res) => { res.render('react-app') });

// Login & Registration API:
app.use('/auth', loginRegisterRouter);

// Lobby API ("Choose Scenario" etc.)
app.use('/api/lobby', lobbyRouter);

// Misc. API used by the single page app frontend:
app.use('/api/app', appAPIRouter);

if (environment === 'test') {
    app.use('/test-utils', testHelperRouter);
}

////////////////////////////////////////////////////////////////////////////////
// Web sockets

const sharedWebSocketClientState = {
    app: app,
    allConnections: new Set(),
    nextConnectionIndex: 0,
}

app.ws('/rpc', (ws, req) => {
    if (!req.user) {
        ws.send("Unauthorized");
        logMessage("Unauthorized websocket connection attempt.")
        ws.close();
        return;
    }
    const connectionState = {
        // A mutable state variable used to track information about this specific connection.
        // i.e. this data is specific to this node process and this browser tab of this user.
        user: req.user,
        index: sharedWebSocketClientState.nextConnectionIndex++,  // A unique number to represent this connection
        sharedState: sharedWebSocketClientState,
        pingTimer: setInterval(() => ws.ping(), 50),  // Used to avoid socket disconnecting after 60s
        peer: JsonRpcPeer,
    };
    sharedWebSocketClientState.allConnections.add(connectionState);

    const peer = connectionState.peer = new JsonRpcPeer(async (message: JsonRpcMessage) => {
        logMessage(`RPC ${message.method} (${connectionState.index})`, message.params);
    });

    peer.on('data', (message: any) => { ws.send(message); })
    ws.on('message', async (message) => {
        const response = await peer.exec(message);
        ws.send(response, err => {
            if (err !== undefined) {
                logMessage(`Error while sending ws reply: ${err}`);
            }
        });
    });
    ws.on('close', () => {
        sharedWebSocketClientState.allConnections.delete(connectionState);
        clearInterval(connectionState.pingTimer);
        connectionState.pingTimer = null;
        logMessage(`${connectionState.user.first_name} has disconnected from the websocket (${connectionState.index}). There are now ${sharedWebSocketClientState.allConnections.size} active connections.`);
    });
    logMessage(`${connectionState.user.first_name} has connected to the websocket (${connectionState.index}). There are now ${sharedWebSocketClientState.allConnections.size} active connections.`);
    peer.notify('connection_ready'); // Clients can/should wait for this before sending data (which will be more reliable than sending immediately after an 'open' event)
});

////////////////////////////////////////////////////////////////////////////////
// Error handling:

// catch 404 and forward to error handler
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const err = new Error('Error 404: Page not found.') as any;
    err.status = 404;
    next(err);
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.status(err.status || 500);
    let message = err.message;
    const errorDetails = (environment === 'development') ? err : null;
    res.render('error', {message, errorDetails});
});

////////////////////////////////////////////////////////////////////////////////
// Startup

app.listen(config.listen_port);
logMessage(`BORIS server is running on port ${config.listen_port} (${environment} mode).`);

module.exports = {app, config};
