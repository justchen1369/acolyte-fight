import * as pl from 'planck-js';
import { isMobile } from '../core/userAgent';
import { TicksPerSecond } from '../../game/constants';
import { AudioElement } from './render.model';

export { AudioElement } from './render.model';

// Constants
const SampleRate = 44100;

const Z = -0.1;
const RefDistance = 0.1;

// Globals
let env: AudioEnvironment = null;
let attached = new Map<string, AudioSource>();
let unattached = new Map<string, AudioSource>();

// Caches
const biteCache = new Map<SoundBite, SoundBiteCacheItem>();
let cacheAge = 0;
let brownNoise: AudioBuffer = null;

interface OutputEnvironment {
    ctx: BaseAudioContext;
    next: AudioNode;
}

interface AudioEnvironment extends OutputEnvironment {
    ctx: AudioContext;
    final: AudioNode;
    next: AudioNode;
    recordingDestination: MediaStreamAudioDestinationNode;
    locked: boolean;
}

interface SoundBiteCacheItem {
    buffer: AudioBuffer;
    creationAge: number;
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

    start(pos: pl.Vec2 | null) {
        this.play(pos, this.sound.start);
    }

    sustain(pos: pl.Vec2 | null) {
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

    private play(pos: pl.Vec2 | null, bites: SoundBite[]) {
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

function getOfflineAudioContextConstructor(): any {
    return ((window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext);
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

    let next: AudioNode = ctx.destination;

    const compressor = ctx.createDynamicsCompressor();
    const final = compressor;
    compressor.connect(next);
    next = compressor;

    const masterVolume = ctx.createGain();
    masterVolume.connect(next);
    masterVolume.gain.value = 0.5;
    next = masterVolume;

    env = {
        ctx,
        final,
        next,
        recordingDestination: null,
        locked: true,
    };
}

export async function cache(sounds: Sounds) {
    const MaxAge = 10; // Haven't used in 10 games, delete

    const OfflineAudioContext = getOfflineAudioContextConstructor();
    if (!OfflineAudioContext) {
        console.log("Cannot cache audio - OfflineAudioContext not available");
        return;
    }

    const start = Date.now();
    
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

    const creationAge = cacheAge++;
    for (const bite of bites) {
        const item = biteCache.get(bite);
        if (item) {
            item.creationAge = creationAge;
            continue;
        }

        const buffer = await bufferSoundBite(bite);
        if (buffer) {
            biteCache.set(bite, { buffer, creationAge });
        }
    }

    // Delete old sound bites
    const cutoff = creationAge - MaxAge;
    biteCache.forEach((item, key) => {
        if (item.creationAge <= cutoff) {
            biteCache.delete(key);
        }
    });

    console.log(`Audio caching completed in ${(Date.now() - start).toFixed(0)} ms`);
}

async function bufferSoundBite(bite: SoundBite) {
    try {
        const ExtraSeconds = 0.5;

        const OfflineAudioContext = getOfflineAudioContextConstructor();
        const offlineCtx = new OfflineAudioContext(1, (bite.stopTime + ExtraSeconds) * SampleRate, SampleRate);
        const offlineEnv: OutputEnvironment = {
            ctx: offlineCtx,
            next: offlineCtx.destination,
        };
        playSoundBite(bite, null, offlineEnv);
        return await offlineCtx.startRendering();
    } catch (exception) {
        console.error("Unable to buffer sound bite", exception);
        return null;
    }
}

export function unlock() {
    if (env && env.locked) {
        env.locked = false;
        if (env.ctx.state === "suspended") {
            env.ctx.resume();
        }
    }
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

export function play(self: pl.Vec2, elems: AudioElement[], sounds: Sounds) {
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
    for (const source of sources.values()) {
        if (!keep.has(source.id)) {
            source.stop();
        }
    }

    return keep;
}

function generateBrownNoise(ctx: BaseAudioContext) {
	const bufferSize = 10 * ctx.sampleRate;
	const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
	const output = noiseBuffer.getChannelData(0);

	let lastOut = 0.0;
	for (var i = 0; i < bufferSize; i++) {
		var white = Math.random() * 2 - 1;
		output[i] = (lastOut + (0.01 * white)) / 1.01;
		lastOut = output[i];
		output[i] *= 3.5; // (roughly) compensate for gain
	}
	return noiseBuffer;
}

function playSoundBite(bite: SoundBite, pos: pl.Vec2 | null, env: OutputEnvironment): AudioRef {
    let next: AudioNode = env.next;
    const nodes = new Array<AudioNode>();

    let panner: PannerNode = null;
    if (!isMobile && pos) { // Only connect panner on desktop
        panner = createPannerNode(pos, env, nodes, next);
        next = panner;
    }

    const volume = next = createVolumeNode(env, nodes, next);

    const cacheItem = biteCache.get(bite);
    if (cacheItem) {
        replayBuffer(cacheItem.buffer, env, nodes, next, () => {
            nodes.forEach(node => node.disconnect());
        });
    } else {
        next = createAttackDecayNode(bite, env, nodes, next);
        next = createTremoloNode(bite, env, nodes, next);
        next = createHighPassNode(bite, env, nodes, next);
        next = createLowPassNode(bite, env, nodes, next);

        createSource(bite, env, nodes, next, () => {
            nodes.forEach(node => node.disconnect());
        });
    }

    return {
        panner,
        volume,
        expire: env.ctx.currentTime + bite.stopTime,
    };
}

function createPannerNode(pos: pl.Vec2, env: OutputEnvironment, nodes: AudioNode[], next: AudioNode): PannerNode {
    const pan = env.ctx.createPanner();
    pan.panningModel = 'HRTF';
    pan.distanceModel = 'inverse';
    pan.refDistance = RefDistance;
    pan.setPosition(pos.x, pos.y, Z);
    pan.setOrientation(0, 0, 1);
    pan.connect(next);
    nodes.push(pan);
    return pan;
}

function createVolumeNode(env: OutputEnvironment, nodes: AudioNode[], next: AudioNode) {
	const volume = env.ctx.createGain();
	volume.gain.setValueAtTime(1, env.ctx.currentTime);

    volume.connect(next);
    nodes.push(volume);
    return volume;
}

function createAttackDecayNode(bite: SoundBite, env: OutputEnvironment, nodes: AudioNode[], next: AudioNode) {
    const t = env.ctx.currentTime;
    const startTime = bite.startTime || 0;
    const stopTime = bite.stopTime;
    const attack = bite.attack || 0.03;
    const decay = bite.decay || 0.03;
    const maxVolume = bite.volume || 1;

    const maxStartTime = t + startTime + attack;
    const maxStopTime = Math.max(maxStartTime, t + stopTime - decay);

    const volume = env.ctx.createGain();
    volume.gain.value = 0;
	volume.gain.setValueAtTime(0, t + startTime);
    volume.gain.linearRampToValueAtTime(maxVolume, maxStartTime);
    if (maxStopTime > maxStartTime) {
        volume.gain.linearRampToValueAtTime(maxVolume, maxStopTime);
    }
	volume.gain.linearRampToValueAtTime(0, t + stopTime);

    volume.connect(next);
    nodes.push(volume);
    return volume;
}

function createTremoloNode(bite: SoundBite, env: OutputEnvironment, nodes: AudioNode[], next: AudioNode) {
    if (!(bite.tremoloFreq && bite.tremoloStrength)) {
        return next;
    }

    const ctx = env.ctx;
    const strength = bite.tremoloStrength;
    const freq = bite.tremoloFreq;
    const startTime = bite.startTime || 0;
    const stopTime = bite.stopTime;

    const tremoloGain = ctx.createGain();
    tremoloGain.gain.value = 1 - strength;
    tremoloGain.connect(next);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(strength, 0);
    oscGain.connect(tremoloGain.gain);

    const tremoloOsc = ctx.createOscillator();
    tremoloOsc.frequency.value = freq;
    tremoloOsc.start(ctx.currentTime + startTime);
    tremoloOsc.stop(ctx.currentTime + stopTime);
    tremoloOsc.connect(oscGain);

    nodes.push(tremoloGain);
    nodes.push(oscGain);
    nodes.push(tremoloOsc);

    return tremoloGain;
}

function createHighPassNode(bite: SoundBite, env: OutputEnvironment, nodes: AudioNode[], next: AudioNode) {
    if (!bite.highPass) {
        return next;
    }

    const highPass = env.ctx.createBiquadFilter();
    highPass.type = "highpass";
    highPass.frequency.value = bite.highPass;
    highPass.connect(next);

    nodes.push(highPass);
    return highPass;
}

function createLowPassNode(bite: SoundBite, env: OutputEnvironment, nodes: AudioNode[], next: AudioNode) {
    if (!bite.lowPass) {
        return next;
    }

    const lowPass = env.ctx.createBiquadFilter();
    lowPass.type = "lowpass";
    lowPass.frequency.value = bite.lowPass;
    lowPass.connect(next);

    nodes.push(lowPass);
    return lowPass;
}

function createNormalizer(divisor: number, env: OutputEnvironment, nodes: AudioNode[], next: AudioNode) {
    const normalizer = env.ctx.createGain();
    normalizer.gain.value = 1 / divisor;
    normalizer.connect(next);
    nodes.push(normalizer);
    return normalizer;
}

function createSource(bite: SoundBite, env: OutputEnvironment, nodes: AudioNode[], next: AudioNode, onEnded: () => void) {
    const ctx = env.ctx;
    const t = ctx.currentTime;

    const startTime = bite.startTime || 0;
    const stopTime = bite.stopTime;

	if (bite.wave === "brown-noise") {
        var noise = ctx.createBufferSource();
        if (!brownNoise) {
            brownNoise = generateBrownNoise(ctx);
        }
		noise.buffer = brownNoise;

		noise.start(t + startTime);
        noise.stop(t + stopTime);
        nodes.push(noise);
        noise.connect(next);

        noise.onended = onEnded;
	} else {
        const ratios = bite.ratios || [1];
        const startFreq = bite.startFreq || 440;
        const stopFreq = bite.stopFreq || 440;

        const frequencyModulator = createFrequencyModulator(bite, env, nodes);
        next = createNormalizer(ratios.length, env, nodes, next); // Ensure volume is the same regardless of number of oscillators

        let ended = false;
		for (const ratio of ratios) {
			const osc = ctx.createOscillator();
			osc.type = bite.wave;

            osc.frequency.value = ratio * startFreq;
			osc.frequency.setValueAtTime(ratio * startFreq, t + startTime);
			osc.frequency.exponentialRampToValueAtTime(ratio * stopFreq, t + stopTime);

			osc.start(t + startTime);
			osc.stop(t + stopTime);

            nodes.push(osc);
            osc.connect(next);
            osc.onended = () => {
                if (!ended) {
                    ended = true;
                    onEnded();
                }
            };
            
            if (frequencyModulator) {
                frequencyModulator.connect(osc.frequency);
            }
		}
    }
}

function replayBuffer(buffer: AudioBuffer, env: OutputEnvironment, nodes: AudioNode[], next: AudioNode, onEnded: () => void) {
    const ctx = env.ctx;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.onended = onEnded;
    source.connect(next);

    nodes.push(source);
    source.start();
}

function createFrequencyModulator(bite: SoundBite, env: OutputEnvironment, nodes: AudioNode[]) {
    const ctx = env.ctx;
    const t = ctx.currentTime;

    const startTime = bite.startTime || 0;
    const stopTime = bite.stopTime;

    if (bite.modStartFreq && bite.modStopFreq && bite.modStartStrength && bite.modStopStrength) {
        const mod = ctx.createOscillator();
        const modGain = ctx.createGain();

        mod.type = bite.wave as OscillatorType;

        mod.frequency.value = bite.modStartFreq;
        mod.frequency.setValueAtTime(bite.modStartFreq, t + startTime);
        mod.frequency.exponentialRampToValueAtTime(bite.modStopFreq, t + stopTime);

        modGain.gain.value = bite.modStartStrength;
        modGain.gain.setValueAtTime(bite.modStartStrength, t + startTime);
        modGain.gain.linearRampToValueAtTime(bite.modStopStrength, t + stopTime);

        mod.connect(modGain);

        mod.start(t + startTime);
        mod.stop(t + stopTime);

        nodes.push(mod);
        nodes.push(modGain);

        return modGain;
    } else {
        return null;
    }
}