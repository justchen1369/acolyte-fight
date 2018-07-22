import queryString from 'query-string';

export interface PathElements {
    page?: string;
    gameId?: string;
    room: string;
    server: string;
}

export function parseLocation(location: Location): PathElements {
    let page: string = null;
    let gameId: string = null;
    let room: string = null;
    let server: string = null;

    if (location.pathname) {
        const elems = location.pathname.split("/");
        page = elems[1] || "";
    }
    if (location.search) {
        const params = queryString.parse(location.search);
        if (params["g"]) {
            gameId = params["g"];
        }
        if (params["room"]) {
            room = params["room"];
        }
        if (params["server"]) {
            server = params["server"];
        }
    }

    return { page, gameId, room, server };
}

export function getPath(elems: PathElements) {
    let pathElements = new Array<string>();
    let params = [];
    if (elems.gameId) {
        params.push("g=" + elems.gameId);
    } else if (elems.page) {
        pathElements = [elems.page];
    }

    if (elems.room) {
        params.push("room=" + elems.room);
    }
    if (elems.server) {
        params.push("server=" + elems.server);
    }

    let path = "/" + pathElements.join("/");
    if (params.length > 0) {
        path += "?" + params.join("&");
    }

    return path;
}

export function getRoomHomePath(current: PathElements) {
    return getPath(Object.assign({}, current, { page: null }));
}

export function exitRoomPath(current: PathElements) {
    return getPath(Object.assign({}, current, { room: null, server: null }));
}