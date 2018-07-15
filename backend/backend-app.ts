import * as express from 'express';
import * as expressWebsocket from 'express-ws';
import * as bodyParser from 'body-parser';
import * as nodemailer from 'nodemailer';
import { SendMailOptions } from 'nodemailer';
import * as nodemailerSparkPostTransport from 'nodemailer-sparkpost-transport';
import * as nodemailerMockTransport from 'nodemailer-mock-transport';
import * as passport from 'passport';
import {Strategy as UniqueTokenStrategy} from 'passport-unique-token';
import * as path from 'path';
import * as session from 'express-session';
import * as connectRedis from 'connect-redis';
import * as whiskers from 'whiskers';
import { Server } from 'http';

import {environment, config} from './config';
import {getDB, BorisDatabase} from './db/db';
import { getRedisClient, wrapRedis } from './db/redisClient';
import {router as appAPIRouter} from './routes/app-api';
import {router as loginRegisterRouter} from './routes/login-register';
import {router as lobbyRouter} from './routes/lobby-api';
import {router as gameRouter} from './routes/game-api';
import {router as marketRouter} from './routes/market-api';
import {router as testHelperRouter} from './routes/test-helper-api';
import {router as appAdminRouter} from './routes/admin-api';
import { subscribeToRedis, getPubSubClient } from './websocket/pub-sub';
import { rpcHandler } from './websocket/connections';

// Declare our additions to the Express API:
import {UserType} from './express-extended';
import { isAdminUser } from './routes/api-utils';

const app = express();
const {getWss} = expressWebsocket(app);

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
app.use(session({
    store: new RedisStore({client: getRedisClient(), logErrors: true}),
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

// Email sending:
app.set('sendMail', (function() {
    let transport;
    let logMessage = false;
    if (environment === 'test') {
        transport = nodemailerMockTransport();
        app.set('mailTransport', transport);
    } else if (config.sparkpost_api_key) {
        transport = nodemailerSparkPostTransport({
            sparkPostApiKey: config.sparkpost_api_key,
            options: {click_tracking: false},
        });
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

// Game API
app.use('/api/game', gameRouter);

// Market API
app.use('/api/market', marketRouter);

// Misc. API used by the single page app frontend:
app.use('/api/app', appAPIRouter);

// The Admin single page React app:
app.use('/api/admin', appAdminRouter);
app.get(/\/admin(\/.*)?/, async (req, res, next) => {
    if (!await isAdminUser(req)) {
        return next();
    }
    res.render('react-admin-app');
});

if (environment === 'test') {
    app.use('/test-utils', testHelperRouter);
}

////////////////////////////////////////////////////////////////////////////////
// Web sockets

app.ws('/rpc', rpcHandler);

////////////////////////////////////////////////////////////////////////////////
// Redis pub/sub notifications (used to know when to send notifications to websocket clients)

subscribeToRedis();

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


let server: Server;

async function startServer({quiet = false, port = config.listen_port}: {quiet?: boolean, port?: number} = {}): Promise<Server> {
    if (app.get('initializedDb') === undefined) {
        app.set('initializedDb', true);
        app.set('db', await getDB());
    }
    await new Promise((resolve, reject) => {
        server = app.listen(port, () => {
        }).once('error', (err: any) => {
            reject(err); // Port in use or other error
        }).once('listening', () => {
            if (!quiet) {
                console.log(`BORIS server is running on port ${port} (${environment} mode).`);
            }
            resolve();
        });
        // Unfortunately the express-ws monkeypatching causes any "port in use" error to usually come up separately:
        getWss().once('error', (err: Error) => {
            reject(err); // Port in use or other error
        });
    });
    return server;
}
/**
 * Stop the server and free all resources that would otherwise
 * keep the Node.js process running (redis, postgres connections...)
 */
async function stopServer() {
    const db = app.get('db');
    await new Promise((resolve) => {
        server.close(resolve);
    });
    await getPubSubClient().quit();
    await wrapRedis(cb => getRedisClient().quit(cb));
    await db.instance.$pool.end();
}

export {app, config, startServer, stopServer};
