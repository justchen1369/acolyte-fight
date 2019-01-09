import * as options from '../options';
import * as sockets from './sockets';

export function getOrigin(region: string) {
    if (region) {
        // Live
        return `https://${region}.acolytefight.io`;
    } else {
        // Dev
        return window.location.origin;
    }
}

export function getRegion(server: string) {
    if (server) {
        // Live
        const match = /^([A-Za-z0-9]+)\-/.exec(server);
        if (match) {
            return match[1];
        } else {
            return null;
        }
    } else {
        // Dev
        return null;
    }
}

export async function connectToServer(url: string) {
    const a = options.getProvider();
    console.log("Reconnecting to ", url);
    await sockets.connect(url, a.authToken);
    console.log("Successfully connected to ", url);
}