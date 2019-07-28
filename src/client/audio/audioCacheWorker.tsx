import * as synth from './synth';
import { SampleRate } from './audio.model';

function getOfflineAudioContextConstructor(): any {
    return ((window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext);
}

export async function bufferSoundBite(bite: SoundBite) {
    try {
        const ExtraSeconds = 1;

        const OfflineAudioContext = getOfflineAudioContextConstructor();
        const offlineCtx: OfflineAudioContext = new OfflineAudioContext(1, (bite.stopTime + ExtraSeconds) * SampleRate, SampleRate);
        synth.generate(bite, offlineCtx, offlineCtx.destination);
        return renderToBuffer(offlineCtx);
    } catch (exception) {
        console.error("Unable to buffer sound bite", exception);
        return null;
    }
}

function renderToBuffer(offlineCtx: OfflineAudioContext) {
    return new Promise<AudioBuffer>((resolve, reject) => {
        offlineCtx.oncomplete = ev => resolve(ev.renderedBuffer);
        offlineCtx.startRendering();
    });
}