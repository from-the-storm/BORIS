import * as redis from 'redis';
import { config } from '../config';

let redisClient: redis.RedisClient;

/**
 * Get the shared redis client instance that we use for caching and publishing pub/sub notifications
 */
export function getRedisClient() {
    if (redisClient === undefined) {
        redisClient = redis.createClient({
            host: config.redis_host,
            port: config.redis_port,
            prefix: config.redis_prefix,
            ...(config.redis_password ? {password: config.redis_password} : {})
        });
    }
    return redisClient;
}
