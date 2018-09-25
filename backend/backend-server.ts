import { startServer } from './backend-app';

////////////////////////////////////////////////////////////////////////////////
// Startup

startServer().catch(err => {
    console.error("Unable to start BORIS server.");
    console.error(err);
    process.exit(1);
});
