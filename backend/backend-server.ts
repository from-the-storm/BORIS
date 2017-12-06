import * as express from 'express';
import * as expressWebsocket from 'express-ws';
import * as bodyParser from 'body-parser';
import * as nodemailer from 'nodemailer';
import * as nodemailerSparkPostTransport from 'nodemailer-sparkpost-transport';
import * as nodemailerMockTransport from 'nodemailer-mock-transport';
import * as passport from 'passport';
import * as path from 'path';
import * as redis from 'redis';
import * as session from 'express-session';
import * as connectRedis from 'connect-redis';
import * as whiskers from 'whiskers';
import {Strategy as LocalStrategy} from 'passport-local';
import * as WebSocket from 'ws';

// Declare our additions to the Express API:
declare global {
    namespace Express {
        // These open interfaces may be extended in an application-specific manner via declaration merging.
        // See for example method-override.d.ts (https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/method-override/index.d.ts)
        interface Request { 
            user: {
                username: string,
                first_name: string,
            };
        }
        interface Response { }
        interface Application {
            ws: (path: string, handler: (ws: WebSocket, req: Express.Request) => void) => void;
        }
    }
}

const app: express.Application = express();
expressWebsocket(app);

// Environment and configuration
const environment: ('production'|'development'|'test') = (process.env.NODE_ENV as any) || 'development';
const config = (() => {
    let config = {
        // Default configuration:
        app_domain: 'localhost:3333',
        app_protocol: 'http' as ('http' | 'https'),
        listen_port: 3333,
        resource_url: '/s',
        sparkpost_api_key: null, // Not required for development
        system_emails_from: "BORIS <dev-no-reply@apocalypsemadeeasy.com>",
        redis_host: 'localhost',
        redis_port: 3331,
        redis_password: 'devpassword',
        redis_prefix: 'boris:',
        secret_key: 'INSECURE - change me for prod',
    };
    if (process.env.BORIS_CONFIG) {
        Object.assign(config, JSON.parse(process.env.BORIS_CONFIG)[environment]);
    }
    // Add some additional derived values and freeze the config:
    return Object.freeze(Object.assign(config, {
        app_url: `${config.app_protocol}://${config.app_domain}`,
    }));
})();

// Locals available in any template:
app.locals.resUrl = config.resource_url;

// Logging
const logMessage = (environment === 'development') ? console.log : () => {};

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
    return async (mailData) => {
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
passport.use(new LocalStrategy(
    {
        usernameField: 'email',
    },
    (email, password, done) => {
        logMessage(`Login attempt for email ${email}`);
        logMessage(`Login attempt succeeded for ${email}`);
        return done(null, {username: 'testuser'});
    }
));
passport.serializeUser((user, done) => { done(null, user.id); });
passport.deserializeUser((id, done) =>{
    const db = app.get('db');
    db.users.find(id).then(user => { done(null, user); }, err => { done(err, null); });
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

////////////////////////////////////////////////////////////////////////////////
// Web sockets

const sharedWebSocketClientState = {
    app: app,
    allConnections: new Set(),
    nextConnectionIndex: 0,
}

app.ws('/ws-api', (ws, req) => {
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
    };
    sharedWebSocketClientState.allConnections.add(connectionState);

    ws.on('message', (message) => {
        ws.send("Reading you 5 by 5.", err => { if (err !== undefined) { logMessage(`Error while sending ws reply: ${err}`); } });
    });
    ws.on('close', () => {
        sharedWebSocketClientState.allConnections.delete(connectionState);
        clearInterval(connectionState.pingTimer);
        connectionState.pingTimer = null;
        logMessage(`${connectionState.user.first_name} has disconnected from the websocket (${connectionState.index}). There are now ${sharedWebSocketClientState.allConnections.size} active connections.`);
    });
    logMessage(`${connectionState.user.first_name} has connected to the websocket (${connectionState.index}). There are now ${sharedWebSocketClientState.allConnections.size} active connections.`);
    ws.send('connection_ready'); // Clients can/should wait for this before sending data (which will be more reliable than sending immediately after an 'open' event)
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
