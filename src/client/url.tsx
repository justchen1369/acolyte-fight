import queryString from 'query-string';
import * as s from './store.model';

export function parseLocation(location: Location): s.PathElements {
    let page: string = null;
    let gameId: string = null;
    let party: string = null;
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
        if (params["party"]) {
            party = params["party"];
        }
        if (params["server"]) {
            server = params["server"];
        }
    }

    return { page, gameId, party, server };
}

export function getPath(elems: s.PathElements) {
    let pathElements = new Array<string>();
    let params = [];
    if (elems.gameId) {
        params.push("g=" + elems.gameId);
    }
    if (elems.page) {
        pathElements = [elems.page];
    }

    if (elems.party) {
        params.push("party=" + elems.party);
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