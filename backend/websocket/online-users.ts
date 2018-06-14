import * as redis from 'redis';
import { getRedisClient } from '../db/redisClient';

/** Helper method to promisify the redis API */
function wrapRedis<T>(fn: (cb: redis.Callback<T>) => void): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        fn((err, reply) => {
            if (err) {
                reject(err);
            } else {
                resolve(reply);
            }
        });
    });
}
const USERS_ONLINE = 'users_online';

export async function setUserOnline(userId: number) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    await wrapRedis(cb => getRedisClient().ZADD(USERS_ONLINE, nowSeconds, userId.toString(), cb));
}

export async function setUserOffline(userId: number) {
    await wrapRedis(cb => getRedisClient().ZREM(USERS_ONLINE, userId.toString(), cb));
    // And clean up expired users, if any:
    const oneMinuteAgo = Math.floor(Date.now() / 1000) - 60;
    await wrapRedis(cb => getRedisClient().ZREMRANGEBYSCORE(USERS_ONLINE, "-inf", oneMinuteAgo, cb));
}

export async function isUserOnline(userId: number) {
    const lastMinute = Math.floor(Date.now() / 1000) - 60;
    const lastSeen = await wrapRedis<string>(cb => getRedisClient().ZSCORE(USERS_ONLINE, userId.toString(), cb));
    if (lastSeen === null) {
        return false;
    }
    return parseInt(lastSeen, 10) > lastMinute;
}
