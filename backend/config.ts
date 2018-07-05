// Environment and configuration
import * as yaml from "js-yaml";
import * as fs from "fs";

export const environment: ('production'|'development'|'test') = (process.env.NODE_ENV as any) || 'development';
export const config = (() => {
    let config = {
        // Default configuration:
        app_domain: 'localhost:3333',
        app_protocol: 'http' as ('http' | 'https'),
        listen_port: 3333,
        resource_url: '/s',
        sparkpost_api_key: null as string|null, // Not required for development
        system_emails_from: "BORIS <no-reply@apocalypsemadeeasy.com>",
        redis_host: 'localhost',
        redis_port: 3331,
        redis_password: 'devpassword',
        redis_prefix: 'boris:',
        db_host: 'localhost',
        db_port: 3332,
        db_name: 'boris',
        db_user: 'boris',
        db_password: 'devpassword',
        secret_key: 'INSECURE - change me for prod',
    };
    // Test configuration:
    if (environment === 'test') {
        Object.assign(config, {
            app_domain: 'localhost:4444',
            listen_port: 4444,
            db_name: 'boris_test',
            redis_prefix: 'boris_test:',
        });
    } else if (environment === 'development') {
        // Allow overriding some config settings from a file (easier in dev environments)
        const configOverridesPath = `${__dirname}/../../boris-private/dev-config.yml`;
        if (fs.existsSync(configOverridesPath)) {
            Object.assign(config, yaml.safeLoad(fs.readFileSync(configOverridesPath, 'utf8')));
        }
    }
    if (process.env.BORIS_CONFIG) {
        Object.assign(config, JSON.parse(process.env.BORIS_CONFIG)[environment]);
    }
    // Add some additional derived values and freeze the config:
    return Object.freeze(Object.assign(config, {
        app_url: `${config.app_protocol}://${config.app_domain}`,
    }));
})();
