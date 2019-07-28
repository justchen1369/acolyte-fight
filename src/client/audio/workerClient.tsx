import defer from 'promise-defer';
import * as r from './audio.model';

let workerElem: HTMLIFrameElement = null;
let nextMsgId = 0;

let ready = defer<void>();

const callbacks = new Map<number, Callback>();

interface Callback {
    (msg: r.Message): void;
}

export function init(): Promise<void> {
    // Listen for responses
    window.addEventListener('message', onMessage);

    // Create iframe worker
    const elem = document.createElement('iframe');
    elem.src = "audioWorker.html";
    elem.className = "worker"
    elem.onload = onWorkerLoaded;
    document.body.appendChild(elem);
    workerElem = elem;

    return ready.promise;
}

async function onWorkerLoaded() {
    console.log("Audio worker loaded.");
    ready.resolve();
}

function onMessage(ev: MessageEvent) {
    const msg = ev.data as r.Message;
    if (msg.key !== "acolyte") {
        // Not meant for us
        return;
    }

    const callback = callbacks.get(msg.id);
    if (callback) {
        callback(msg);
    }
}

function call(req: r.Message): Promise<r.Message> {
    return new Promise((resolve, reject) => {
        callbacks.set(req.id, (res) => {
            callbacks.delete(req.id);
            resolve(res);
        });
        workerElem.contentWindow.postMessage(req, "*");
    });
}

export async function isBufferingAvailable() {
    await ready.promise;

    const req: r.ReadyRequest = {
        key: "acolyte",
        id: nextMsgId++,
        type: "readyRequest",
    };
    const res = await call(req) as r.ReadyResponse;
    return res.offlineAvailable;
}

export async function bufferSoundBite(bite: SoundBite, ctx: BaseAudioContext): Promise<AudioBuffer> {
    await ready.promise;

    const req: r.CacheAudioRequest = {
        key: "acolyte",
        id: nextMsgId++,
        type: "cacheRequest",
        bite,
    };
    const res = await call(req) as r.CacheAudioResponse;
    const buffer = ctx.createBuffer(res.numberOfChannels, res.length, res.sampleRate);
    const bytes = buffer.getChannelData(0);
    bytes.set(new Float32Array(res.arrayBuffer));
    return buffer;
}