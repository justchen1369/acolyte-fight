import * as m from '../game/messages.model';
import * as url from './url';

export function createAndJoinRoomAsync(file: File, current: url.PathElements) {
    return readFileAsync(file)
        .then(json => json ? JSON.parse(json) : {})
        .then(mod => createRoomAsync(mod))
        .then(msg => {
            const path = url.getPath(Object.assign({}, current, {
                gameId: null,
                room: msg.roomId,
                server: msg.server,
            }));
            window.location.href = path;
        })
}

function createRoomAsync(mod: Object) {
    console.log("Creating room with mod", mod);
    return fetch('api/room', {
        credentials: "same-origin",
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({ mod } as m.CreateRoomRequest),
    }).then(res => res.json()).then((msg: m.CreateRoomResponse) => msg);
}

function readFileAsync(file: File): Promise<string> {
    if (file) {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(reader.result)
            reader.onerror = (ev) => reject(reader.error)
            reader.readAsText(file);
        });
    } else {
        return Promise.resolve<string>(null);
    }
}