import * as synth from './synth';
import { isMobile } from '../core/userAgent';
import { TicksPerSecond } from '../../game/constants';
import { AudioElement, SampleRate, Vec2 } from './audio.model';
export { AudioElement } from './audio.model';

// Constants
const Z = -0.1;
const RefDistance = 0.1;

// Globals
let env: AudioEnvironment = null;
let attached = new Map<string, AudioSource>();
let unattached = new Map<string, AudioSource>();

// Caches
const biteCache = new Map<SoundBite, SoundBiteCacheItem>();
let biteCacheSounds: Sounds = null;
let cacheVersion = 0;

interface AudioEnvironment {
    ctx: AudioContext;
    final: AudioNode;
    next: AudioNode;
    muted: boolean;
    recordingDestination: MediaStreamAudioDestinationNode;
    locked: boolean;
}

interface SoundBiteCacheItem {
    buffer: AudioBuffer;
    version: number;
}

interface AudioRef {
    panner?: PannerNode;
    volume: GainNode;
    expire: number;
}

class AudioSource {
    id: string;
    private sound: Sound;

    private intensity = 1;
    private repeatWhen = 0;
    private following = new Array<AudioRef>();

    constructor(id: string, sound: Sound) {
        this.id = id;
        this.sound = sound;
    }

    start(pos: Vec2 | null) {
        this.play(pos, this.sound.start);
    }

    sustain(pos: Vec2 | null) {
        const t = env.ctx.currentTime;

        // Play sounds
        if (t >= this.repeatWhen) {
            const repeatIntervalSeconds = this.sound.repeatIntervalSeconds || 1;
            this.repeatWhen = t + repeatIntervalSeconds;
            this.play(pos, this.sound.sustain);
        }

        // Pan existing sounds
        const keep = new Array<AudioRef>();
        for (const follow of this.following) {
            if (t >= follow.expire) {
                continue;
            }

            keep.push(follow);

            if (pos && follow.panner) {
                if (follow.panner.positionX && follow.panner.positionY) {
                    const when = t + 1 / TicksPerSecond;
                    follow.panner.positionX.linearRampToValueAtTime(pos.x, when);
                    follow.panner.positionY.linearRampToValueAtTime(pos.y, when);
                } else {
                    follow.panner.setPosition(pos.x, pos.y, Z);
                }
            }
        }
        this.following = keep;
    }

    intensify(intensity: number) {
        if (intensity > this.intensity) {
            this.intensity = intensity;
        } else {
            const alpha = (this.sound.intensityUpdateFactor || 0.01);
            this.intensity = intensity * alpha + this.intensity * (1 - alpha);
        }
        this.changeVolume(this.intensity, this.sound.intensityDelay || 0.05);
    }

    stop() {
        // Stop sounds
        const cutoffEarly = this.sound.cutoffEarly === undefined ? true : this.sound.cutoffEarly;
        if (cutoffEarly) {
            this.changeVolume(0, this.sound.cutoffSeconds);
        }
    }

    private changeVolume(newVolume: number, delay: number = 0.05) {
        delay = delay || 0.05;

        const t = env.ctx.currentTime;
        for (const follow of this.following) {
            const current = follow.volume.gain.value;
            follow.volume.gain.cancelScheduledValues(t);
            follow.volume.gain.setValueAtTime(current, t);
            follow.volume.gain.linearRampToValueAtTime(newVolume, t + delay);
        }
    }

    private play(pos: Vec2 | null, bites: SoundBite[]) {
        if (bites) {
            for (const bite of bites) {
                const follow = playSoundBite(bite, pos, env);
                this.following.push(follow);
            }
        }
    }
}

function getAudioContextConstructor(): any {
    return ((window as any).AudioContext || (window as any).webkitAudioContext);
}

export function init() {
    const AudioContext = getAudioContextConstructor();
    if (!AudioContext) {
        return;
    }

    const params: AudioContextOptions = {
        sampleRate: SampleRate,
    };
    const ctx = new AudioContext(params) as AudioContext;

    ctx.listener.setPosition(0.5, 0.5, 0);
    ctx.listener.setOrientation(0, 0, -1, 0, 1, 0);

    const compressor = ctx.createDynamicsCompressor();
    const final = compressor;
    let next: AudioNode = compressor;

    const masterVolume = ctx.createGain();
    masterVolume.connect(next);
    masterVolume.gain.value = 0.5;
    next = masterVolume;

    env = {
        ctx,
        final,
        next,
        muted: true,
        recordingDestination: null,
        locked: true,
    };
}

export async function cache(sounds: Sounds) {
    /*
    const MaxAge = 3; // Haven't used in 3 games, delete
    if (biteCacheSounds === sounds) {
        return;
    }
    biteCacheSounds = sounds;

    const OfflineAudioContext = getOfflineAudioContextConstructor();
    if (!OfflineAudioContext) {
        console.log("Cannot cache audio - OfflineAudioContext not available");
        return;
    }

    const crashingUntil = await storage.getOfflineCrashing();
    const unix = moment().unix();
    if (unix < crashingUntil) {
        console.log("Not audio caching as a crash was detected recently.");
        return;
    }

    const start = Date.now();
    console.log(`Audio caching started...`);
    
    const bites = new Array<SoundBite>();
    for (const id in sounds) {
        const sound = sounds[id];
        if (sound.start) {
            bites.push(...sound.start);
        }
        if (sound.sustain) {
            bites.push(...sound.sustain);
        }
    }

    await storage.setOfflineCrashing(unix + 86400); // Don't retry audio caching until tomorrow, if it fails
    let oneSucceeded = false;

    let numCreated = 0;
    const version = cacheVersion++;
    for (const bite of bites) {
        const item = biteCache.get(bite);
        if (item) {
            item.version = version;
            continue;
        }

        const buffer = await bufferSoundBite(bite);
        if (buffer) {
            ++numCreated;
            biteCache.set(bite, { buffer, version: version });
        }

        if (!oneSucceeded) {
            oneSucceeded = true;
            await storage.clearOfflineCrashing();
        }
    }

    // Delete old sound bites
    const cutoff = version - MaxAge;
    biteCache.forEach((item, key) => {
        if (item.version <= cutoff) {
            biteCache.delete(key);
        }
    });

    console.log(`Cached ${numCreated} sounds in ${(Date.now() - start).toFixed(0)} ms`);
    */
}

export function unlock() {
    if (env && env.locked) {
        env.locked = false;
        if (env.ctx.state === "suspended") {
            env.ctx.resume();
        }
    }
}

export function mute() {
    if (env.muted) {
        return;
    }

    env.final.disconnect(env.ctx.destination);
    env.muted = true;
}

export function unmute() {
    if (!env.muted) {
        return;
    }

    env.final.connect(env.ctx.destination);
    env.muted = false;
}

export function record() {
    if (env.recordingDestination) {
        return env.recordingDestination.stream;
    }

    const recordingDest = env.ctx.createMediaStreamDestination();
    env.final.connect(recordingDest);
    env.recordingDestination = recordingDest;
    return recordingDest.stream;
}

export function unrecord() {
    if (env.recordingDestination) {
        env.final.disconnect(env.recordingDestination);
        env.recordingDestination = null;
    }
}

export function play(self: Vec2, elems: AudioElement[], sounds: Sounds) {
    if (!env) {
        return;
    }

    env.ctx.listener.setPosition(self.x, self.y, 0);

    // Replace sources for next time
    attached = playReactively(attached, elems, sounds);
}

export function playUnattached(elems: AudioElement[], sounds: Sounds) {
    if (!env) {
        return;
    }

    // Replace sources for next time
    unattached = playReactively(unattached, elems, sounds);
}

function playReactively(sources: Map<string, AudioSource>, elems: AudioElement[], sounds: Sounds) {
    const keep = new Map<string, AudioSource>();

    // Start/sustain current sound sources
    for (const elem of elems) {
        let source = sources.get(elem.id) || keep.get(elem.id);
        if (!source) {
            const sound = sounds[elem.sound];
            if (sound) {
                source = new AudioSource(elem.id, sound);
                source.start(elem.pos);
            }
        }

        if (source) {
            source.sustain(elem.pos);
            keep.set(source.id, source);
        }

        if (source && elem.intensity !== undefined) {
            source.intensify(elem.intensity);
        }
    }

    // Stop expired sound sources
    sources.forEach(source => {
        if (!keep.has(source.id)) {
            source.stop();
        }
    });

    return keep;
}

function playSoundBite(bite: SoundBite, pos: Vec2 | null, env: AudioEnvironment): AudioRef {
    let next: AudioNode = env.next;

    let panner: PannerNode = null;
    if (!isMobile && pos) { // Only connect panner on desktop
        panner = createPannerNode(pos, env, next);
        next = panner;
    }

    const volume = next = createVolumeNode(env, next);

    const cacheItem = biteCache.get(bite);
    if (cacheItem) {
        replayBuffer(cacheItem.buffer, env, next);
    } else {
        synth.generate(bite, env.ctx, next);
    }

    return {
        panner,
        volume,
        expire: env.ctx.currentTime + bite.stopTime,
    };
}

function createPannerNode(pos: Vec2, env: AudioEnvironment, next: AudioNode): PannerNode {
    const pan = env.ctx.createPanner();
    pan.panningModel = 'HRTF';
    pan.distanceModel = 'inverse';
    pan.refDistance = RefDistance;
    pan.setPosition(pos.x, pos.y, Z);
    pan.setOrientation(0, 0, 1);
    pan.connect(next);
    return pan;
}

function createVolumeNode(env: AudioEnvironment, next: AudioNode) {
	const volume = env.ctx.createGain();
	volume.gain.setValueAtTime(1, env.ctx.currentTime);

    volume.connect(next);
    return volume;
}

function replayBuffer(buffer: AudioBuffer, env: AudioEnvironment, next: AudioNode) {
    const ctx = env.ctx;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(next);

    source.start();
}