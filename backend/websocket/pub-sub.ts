import * as redis from 'redis';

import { config } from '../config';
import { BorisDatabase, getDB } from '../db/db';
import { getRedisClient } from '../db/redisClient';
import { notifyConnectedUsers } from './connections';
import { AnyNotification } from '../../common/notifications';


let redisPubSubClient: redis.RedisClient;

/**
 * Get the shared redis client instance that we use for subscribing to pub/sub notifications
 */
export function getPubSubClient() {
    if (redisPubSubClient === undefined) {
        redisPubSubClient = redis.createClient({
            host: config.redis_host,
            port: config.redis_port,
            prefix: config.redis_prefix,
            ...(config.redis_password ? {password: config.redis_password} : {})
        });
    }
    return redisPubSubClient;
}

////////////////////////////////////////////////////////////////////////////////
// Redis pub/sub notifications (used to know when to send notifications to websocket clients)
interface PubSubMessageData {
    userIds: number[];
    event: AnyNotification;
}

const eventsChannel = config.redis_prefix + "app_events";

export function subscribeToRedis() {
    const pubsubClient = getPubSubClient();
    pubsubClient.subscribe(eventsChannel);
    pubsubClient.on('message', async (channel, message) => {
        if (channel != eventsChannel) {
            return;
        }
        let data: PubSubMessageData = null;
        try {
            data = JSON.parse(message);
        } catch (e) {
            console.error("Unable to parse pub/sub message.");
            return;
        }
        console.log("pubsub message: ", message);
        // Get the list of relevant users:
        notifyConnectedUsers(data.userIds, data.event);
    });
}

export function publishEventToUsers(userIds: number[], event: AnyNotification) {
    const redisClient = getRedisClient();
    const data: PubSubMessageData = {userIds, event};
    redisClient.publish(eventsChannel, JSON.stringify(data));
}

export async function publishEventToTeam(teamId: number, event: AnyNotification) {
    const db: BorisDatabase = await getDB();
    const userIds = (await db.team_members.find({team_id: teamId, is_active: true})).map(tm => tm.user_id);
    publishEventToUsers(userIds, event);
}
