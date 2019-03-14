/**
 * Code to track the websocket connections
 */
import * as express from 'express';
import * as WebSocket from 'ws';
import JsonRpcPeer from 'json-rpc-peer';
import {JsonRpcMessage} from 'json-rpc-protocol';

import { setUserOnline, setUserOffline } from './online-users';
import { notifyTeamStatusChangedForUser } from './team-changed';
import { AnyNotification } from '../../common/notifications';
import { User } from '../db/models';

interface ConnectionState {
    // A mutable state variable used to track information about this specific connection.
    // i.e. this data is specific to this node process and this browser tab of this user.
    user: User;
    index: number;  // A unique number to represent this connection
    sharedState: {allConnections: Set<ConnectionState>, nextConnectionIndex: number};
    pingTimer: NodeJS.Timer|null;  // Used to avoid socket disconnecting after 60s
    peer: any;
}

const sharedWebSocketClientState = {
    allConnections: new Set<ConnectionState>(),
    nextConnectionIndex: 0,
}

export function rpcHandler(ws: WebSocket, req: express.Request) {
    if (!req.user) {
        ws.send("Unauthorized");
        console.log("Unauthorized websocket connection attempt.")
        ws.close();
        return;
    }
    const app = req.app;
    const connectionState: ConnectionState = {
        user: req.user,
        index: sharedWebSocketClientState.nextConnectionIndex++,
        sharedState: sharedWebSocketClientState,
        pingTimer: null,
        peer: null,
    };
    // Mark the user as being online now,
    // And update the "last seen" time every 50s when we ping them:
    setUserOnline(req.user.id).then(() => {
        notifyTeamStatusChangedForUser(app, req.user.id);
    });
    // This sharedWebSocketClientState is local to this node.js process so may not be aware of ALL connections,
    // which is the responsibility of the redis USERS_ONLINE tracker.
    sharedWebSocketClientState.allConnections.add(connectionState);

    const peer = connectionState.peer = new JsonRpcPeer(async (message: JsonRpcMessage) => {
        console.log(`RPC ${message.method} (${connectionState.index})`, message.params);
    });

    peer.on('data', (message: any) => { ws.send(message); })
    ws.on('message', async (message) => {
        const response = await peer.exec(message);
        ws.send(response, err => {
            if (err !== undefined) {
                console.log(`Error while sending ws reply: ${err}`);
            }
        });
    });
    ws.on('close', () => {
        peer.failPendingRequests("connection lost");
        sharedWebSocketClientState.allConnections.delete(connectionState);
        if (connectionState.pingTimer !== null) {
            clearInterval(connectionState.pingTimer);
            connectionState.pingTimer = null;
        }
        const userHasOtherActiveConnections = () => {
            for (const otherConnection of sharedWebSocketClientState.allConnections.values()) {
                if (otherConnection.user.id === connectionState.user.id) {
                    return true;
                }
            }
            return false;
        }
        if (!userHasOtherActiveConnections()) {
            setUserOffline(connectionState.user.id).then(() => {
                notifyTeamStatusChangedForUser(app, req.user.id);
            });
        }
        console.log(`${connectionState.user.first_name} has disconnected from the websocket (${connectionState.index}). There are now ${sharedWebSocketClientState.allConnections.size} active connections.`);
    });
    // Send a ping every 30s to keep clients from disconnecting, and so they can 
    // know the connection is still working (or not). Some browsers seem to disconnect
    // after as little as 60s of inactivity on the websocket.
    // Since our client code running in the browser cannot be aware of the websocket
    // ping/pong messages, we have to send it as a JSON RPC message
    connectionState.pingTimer = setInterval(async () => {
        try {
            //console.log(`sending ping to peer ${connectionState.index}`);
            await peer.notify('ping');
            setUserOnline(req.user.id);
        } catch (err) {
            console.error(`Error while sending ws ping: ${err}`);
            ws.close();
        }
    }, 30_000);

    console.log(`${connectionState.user.first_name} has connected to the websocket (${connectionState.index}). There are now ${sharedWebSocketClientState.allConnections.size} active connections.`);
    peer.notify('connection_ready'); // Clients can/should wait for this before sending data (which will be more reliable than sending immediately after an 'open' event)
}

export function notifyConnectedUsers(userIds: number[], event: AnyNotification) {
    sharedWebSocketClientState.allConnections.forEach(conn => {
        if (userIds.indexOf(conn.user.id) !== -1) {
            console.log(`Notifying peer ${conn.index}`);
            try {
                conn.peer.notify(event.type, event);
            } catch(e) {
                console.error(`Unable to notify peer ${conn.index}: ${e}`);
            }
        }
    });
}
