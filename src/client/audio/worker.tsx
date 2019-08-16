import * as r from './audio.model';
import * as synth from './synth';
import { SampleRate } from './audio.model';

function init() {
    window.addEventListener('message', onMessage);
}

function onMessage(ev: MessageEvent) {
    const request = ev.data as r.Message;
    if (!(request && request.key === "acolyte")) {
        // Not meant for us
        return;
    }

    if (request.type === "readyRequest") {
        onReadyRequest(request);
    } else if (request.type === "cacheRequest") {
        onCacheRequest(request);
    }
};

async function onReadyRequest(req: r.ReadyRequest) {
    const OfflineAudioContext = getOfflineAudioContextConstructor();
    const msg: r.ReadyResponse = {
        key: "acolyte",
        type: "readyResponse",
        id: req.id,
        offlineAvailable: !!OfflineAudioContext,
    };
    window.parent.postMessage(msg, "*");
}

async function onCacheRequest(req: r.CacheAudioRequest) {
    const buffer = await bufferSoundBite(req.bite);
    const bytes = buffer.getChannelData(0);

    const msg: r.CacheAudioResponse = {
        key: "acolyte",
        type: "cacheResponse",
        id: req.id,
        length: buffer.length,
        numberOfChannels: buffer.numberOfChannels,
        sampleRate: buffer.sampleRate,
        arrayBuffer: bytes.buffer,
    };
    window.parent.postMessage(msg, "*");
}

function getOfflineAudioContextConstructor(): any {
    return ((window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext);
}

async function bufferSoundBite(bite: SoundBite) {
    try {
        const ExtraSeconds = 1;

        const OfflineAudioContext = getOfflineAudioContextConstructor();
        const ctx: OfflineAudioContext = new OfflineAudioContext(1, (bite.stopTime + ExtraSeconds) * SampleRate, SampleRate);
        synth.generate(bite, ctx, ctx.destination);
        return renderToBuffer(ctx);
    } catch (exception) {
        console.error("Unable to buffer sound bite", exception);
        return null;
    }
}

function renderToBuffer(offlineCtx: OfflineAudioContext): Promise<AudioBuffer> {
    return new Promise<AudioBuffer>(resolve => {
        offlineCtx.oncomplete = ev => resolve(ev.renderedBuffer);
        offlineCtx.startRendering();
    });
}

(window as any).acolyteAudioInit = init;