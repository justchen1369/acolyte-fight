import msgpackParser from 'socket.io-msgpack-parser';
import * as m from '../../game/messages.model';
import * as w from '../../game/world.model';
import * as SocketIO from 'socket.io-client';
import * as StoreProvider from '../storeProvider';
import { notify } from './notifications';

export interface ReconnectHandler {
    (connection: Connection): Promise<Connection>;
}

export interface SocketEventHandler {
    (data: any): void;
}

const reconnectHandlers = new Array<ReconnectHandler>();
let serverInstanceId: string = null;
let connectPromise: Promise<Connection> = Promise.reject("Connection not initialised");

export let listeners: Listeners = {
	onTickMsg: () => { },
	onPartyMsg: () => { },
	onGameMsg: () => { },
	onHeroMsg: () => { },
	onRoomMsg: () => { },
};

export interface Listeners {
	onTickMsg: (msg: m.TickMsg) => void;
	onPartyMsg: (msg: m.PartyMsg) => void;
	onGameMsg: (msg: m.GameStatsMsg) => void;
	onHeroMsg: (msg: m.HeroMsg) => void;
	onRoomMsg: (msg: m.RoomUpdateMsg) => void;
}

export function onReconnect(handler: ReconnectHandler) {
    reconnectHandlers.push(handler);
}

export function connect(socketUrl: string, authToken: string) {
	const config: SocketIOClient.ConnectOpts = {};
	(config as any).parser = msgpackParser;

	if (authToken) {
        config.transportOptions = {
            polling: {
                extraHeaders: { [m.AuthHeader]: authToken }
            },
        };
	}
    const socket = SocketIO.default(socketUrl, config);
    const connection = new Connection(socket);

	connection.on('connect', () => {
        console.log("Connected as socket " + socket.id);
        connectPromise = Promise.resolve(connection);
        connectPromise = connectPromise.then(connectServerInstance);
        connectPromise = connectPromise.then(connectProxy);
        reconnectHandlers.forEach(handler => {
            connectPromise = connectPromise.then(handler);
        });
    });
    socket.on('disconnect', () => {
        onDisconnectMsg();
        connectPromise = Promise.reject("Disconnected");
    });
	socket.on('tick', (msg: m.TickMsg) => listeners.onTickMsg(msg));
	socket.on('party', (msg: m.PartyMsg) => listeners.onPartyMsg(msg));
	socket.on('game', (msg: m.GameStatsMsg) => listeners.onGameMsg(msg));
	socket.on('hero', (msg: m.HeroMsg) => listeners.onHeroMsg(msg));
	socket.on('room', (msg: m.RoomUpdateMsg) => listeners.onRoomMsg(msg));
}

export function get(): Promise<Connection> {
    return connectPromise;
}

async function connectServerInstance(connection: Connection): Promise<Connection> {
    const response: m.ServerInstanceResponseMsg = await connection.query('instance', {} as m.ServerInstanceRequest);
    if (response.success === false) {
        connection.disconnect();
        throw response.error;
    }

    const newInstanceId = response.instanceId;
    if (serverInstanceId && serverInstanceId !== newInstanceId) {
        // The server has restarted, we need to reload because there might be a new release
        connection.disconnect();
        throw "Server restarted, must reload";
    }

    StoreProvider.dispatch({ type: "updateServer", server: response.server, region: response.region, socketId: connection.id() });
    serverInstanceId = newInstanceId;

    return connection;
}

async function connectProxy(connection: Connection): Promise<Connection> {
    const store = StoreProvider.getState();
    let server: string = null;
    if (store.current.server) {
        server = store.current.server;
    } else if (store.party) {
        server = store.party.server;
    }

    if (!server) {
        return connection;
    }

    const request: m.ProxyRequestMsg = { server };
    const response: m.ProxyResponseMsg = await connection.query('proxy', request);

    if (response.success === false) {
        throw `Failed to connect to upstream ${server}`;
    }

    StoreProvider.dispatch({ type: "updateServer", server: response.server, region: response.region, socketId: response.socketId });
    console.log(`Connected to upstream ${server}, changed to socketId ${response.socketId}`);

    return connection;
}

function onDisconnectMsg() {
	StoreProvider.dispatch({ type: "disconnected" });
	notify({ type: "disconnected" });
}

export class Connection {
    private socket: SocketIOClient.Socket;

    constructor(socket: SocketIOClient.Socket) {
        this.socket = socket;
    }

    id(): string {
        return this.socket.id;
    }

    disconnect() {
        this.socket.disconnect();
    }

    send(event: string, data: any) {
        this.socket.emit(event, data);
    }

    query(event: string, data: any): Promise<any> {
        return new Promise<any>((resolve) => {
            this.socket.emit(event, data, (response: any) => {
                resolve(response);
            });
        });
    }

    on(event: string, callback: SocketEventHandler) {
        this.socket.on(event, callback);
    }
}