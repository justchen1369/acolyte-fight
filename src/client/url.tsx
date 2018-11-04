import queryString from 'query-string';
import * as s from './store.model';

export const base = (window as any).baseUrl || "";

export function parseLocation(location: Location): s.PathElements {
    let page: string = null;
    let gameId: string = null;
    let party: string = null;
    let server: string = null;
    let profileId: string = null;
    let hash: string = null;

    if (location.pathname) {
        const elems = location.pathname.split("/");
        page = elems[1] || "";
        if (page === "index.html" || page === "instant-bundle") {
            page = "";
        }
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
        if (params["p"]) {
            profileId = params["p"];
        }
    }
    if (location.hash) {
        hash = location.hash;
    }

    return { page, gameId, profileId, party, server, hash };
}

export function getPath(elems: s.PathElements) {
    let pathElements = new Array<string>();
    let params = [];
    if (elems.gameId) {
        params.push("g=" + elems.gameId);
    } else if (elems.profileId) {
        params.push("p=" + elems.profileId);
        pathElements = ["profile"];
    } else if (elems.page) {
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

    if (elems.hash) {
        path += "#" + elems.hash;
    }

    return path;
}