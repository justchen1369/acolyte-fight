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
