import * as express from 'express';
import * as redis from 'redis';

import {config} from '../config';
import {BorisDatabase} from '../db/db';
import { notifyConnectedUsers } from './connections';
import { NotificationType } from '../../common/notifications';

////////////////////////////////////////////////////////////////////////////////
// Redis pub/sub notifications (used to know when to send notifications to websocket clients)
interface PubSubMessageData {
    teamId: number;
    eventType: NotificationType;
    data: any;
}

const eventsChannel = config.redis_prefix + "app_events";

export function subscribeToRedis(app: express.Application) {
    const pubsubClient = app.get('pubsubClient') as redis.RedisClient;
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
        const teamId: number = data.teamId;
        const db: BorisDatabase = app.get('db');
        const userIds = (await db.team_members.find({team_id: teamId, is_active: true})).map(tm => tm.user_id);
        notifyConnectedUsers(userIds, data.eventType, data.data);
    });
}

export function publishEvent(app: express.Application, event: PubSubMessageData) {
    const redisClient: redis.RedisClient = app.get('redisClient');
    redisClient.publish(eventsChannel, JSON.stringify(event));
}
