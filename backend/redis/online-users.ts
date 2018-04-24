import * as redis from 'redis';
import {redisClient} from '../backend-app';

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
    await wrapRedis(cb => redisClient.ZADD(USERS_ONLINE, nowSeconds, userId.toString(), cb));
}

export async function setUserOffline(userId: number) {
    await wrapRedis(cb => redisClient.ZREM(USERS_ONLINE, userId.toString(), cb));
    // And clean up expired users, if any:
    const nowSeconds = Math.floor(Date.now() / 1000);
    await wrapRedis(cb => redisClient.ZREMRANGEBYSCORE(USERS_ONLINE, "-inf", nowSeconds, cb));
}

export async function isUserOnline(userId: number) {
    const lastMinute = Math.floor(Date.now() / 1000) - 60;
    const lastSeen = await wrapRedis<string>(cb => redisClient.ZSCORE(USERS_ONLINE, userId.toString(), cb));
    if (lastSeen === null) {
        return false;
    }
    return parseInt(lastSeen, 10) > lastMinute;
}
