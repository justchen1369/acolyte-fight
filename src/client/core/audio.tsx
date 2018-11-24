import * as pl from 'planck-js';
import * as w from '../../game/world.model';
import Reverb from 'soundbank-reverb';
import { ReverbNode } from 'soundbank-reverb';

const Z = -0.1;
const RefDistance = 0.1;
let env: AudioEnvironment = null;
let sources = new Map<string, AudioSource>();

interface AudioEnvironment {
    ctx: AudioContext;
    brownNoise: AudioBuffer;
    reverb: ReverbNode;
}

interface AudioRef {
    panner: PannerNode;
    volume: GainNode;
    expire: number;
}

class AudioSource {
    id: string;
    private sound: Sound;

    private repeatWhen = 0;
    private following = new Array<AudioRef>();

    constructor(id: string, sound: Sound) {
        this.id = id;
        this.sound = sound;
    }

    start(pos: pl.Vec2) {
        this.play(pos, this.sound.start);
    }

    sustain(pos: pl.Vec2) {
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
            follow.panner.setPosition(pos.x, pos.y, Z);
        }
        this.following = keep;
    }

    stop() {
        const t = env.ctx.currentTime;

        // Stop sounds
        const cutoffEarly = this.sound.cutoffEarly === undefined ? true : this.sound.cutoffEarly;
        if (cutoffEarly) {
            const decay = this.sound.cutoffSeconds || 0.05;
            for (const follow of this.following) {
                const current = follow.volume.gain.value;
                follow.volume.gain.cancelScheduledValues(t);
                follow.volume.gain.setValueAtTime(current, t);
                follow.volume.gain.linearRampToValueAtTime(0, t + decay);
            }
        }
    }

    private play(pos: pl.Vec2, bites: SoundBite[]) {
        if (bites) {
            for (const bite of bites) {
                const follow = playSoundBite(bite, pos, env);
                this.following.push(follow);
            }
        }
    }
}

export function init() {
    const audioContextConstructor = ((window as any).AudioContext || (window as any).webkitAudioContext);
    if (audioContextConstructor) {
        const ctx = new audioContextConstructor() as AudioContext;
        const brownNoise = generateBrownNoise(ctx);
        const reverb = createReverb(ctx);
        reverb.connect(ctx.destination);

        ctx.listener.setPosition(0.5, 0.5, 0);
        ctx.listener.setOrientation(0, 0, -1, 0, 1, 0);

        env = {
            ctx,
            brownNoise,
            reverb,
        };
    }
}

export function play(self: pl.Vec2, elems: w.AudioElement[], sounds: Sounds) {
    if (!env) {
        return;
    }

    env.ctx.listener.setPosition(self.x, self.y, 0);

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
    }

    // Stop expired sound sources
    for (const source of sources.values()) {
        if (!keep.has(source.id)) {
            source.stop();
        }
    }

    // Replace sources for next time
    sources = keep;
}

function generateBrownNoise(ctx: AudioContext) {
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

function createReverb(ctx: AudioContext): ReverbNode {
    const reverb = Reverb(ctx);

    reverb.time = 1 //seconds
    reverb.wet.value = 0.8
    reverb.dry.value = 1

    reverb.filterType = 'lowpass'
    reverb.cutoff.value = 4000 //Hz

    return reverb;
}

function playSoundBite(bite: SoundBite, pos: pl.Vec2, env: AudioEnvironment): AudioRef {
    let next: AudioNode = env.reverb;
    const panner = next = createPannerNode(pos, env, next);
    const volume = next = createAttackDecayNode(bite, env, next);
    next = createTremoloNode(bite, env, next);
    next = createHighPassNode(bite, env, next);
    next = createLowPassNode(bite, env, next);

    createSource(bite, env, next);

    return {
        panner,
        volume,
        expire: env.ctx.currentTime + bite.stopTime,
    };
}

function createPannerNode(pos: pl.Vec2, env: AudioEnvironment, next: AudioNode) {
    const pan = env.ctx.createPanner();
    pan.panningModel = 'HRTF';
    pan.refDistance = RefDistance;
    pan.setPosition(pos.x, pos.y, Z);
    pan.setOrientation(0, 0, 1);
    pan.connect(next);
    return pan;
}

function createAttackDecayNode(bite: SoundBite, env: AudioEnvironment, next: AudioNode) {
    const t = env.ctx.currentTime;
    const startTime = bite.startTime || 0;
    const stopTime = bite.stopTime;
    const attack = bite.attack || 0.03;
    const decay = bite.decay || 0.03;

	const volume = env.ctx.createGain();
	volume.gain.setValueAtTime(0, t + startTime);
	volume.gain.linearRampToValueAtTime(1, t + startTime + attack);
	volume.gain.linearRampToValueAtTime(1, t + stopTime - decay);
	volume.gain.linearRampToValueAtTime(0, t + stopTime);

	volume.connect(next);
    return volume;
}

function createTremoloNode(bite: SoundBite, env: AudioEnvironment, next: AudioNode) {
    if (!(bite.tremoloFreq && bite.tremoloStrength)) {
        return next;
    }

    const ctx = env.ctx;
    const strength = bite.tremoloStrength;
    const freq = bite.tremoloFreq;
    const startTime = bite.startTime || 0;
    const stopTime = bite.stopTime;

    const tremoloGain = ctx.createGain();
    tremoloGain.gain.setValueAtTime(1 - strength, 0);
    tremoloGain.connect(next);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(strength, 0);
    oscGain.connect(tremoloGain.gain);

    const tremoloOsc = ctx.createOscillator();
    tremoloOsc.frequency.setValueAtTime(freq, 0);
    tremoloOsc.start(ctx.currentTime + startTime);
    tremoloOsc.stop(ctx.currentTime + stopTime);
    tremoloOsc.connect(oscGain);

    return tremoloGain;
}

function createHighPassNode(bite: SoundBite, env: AudioEnvironment, next: AudioNode) {
    if (!bite.highPass) {
        return next;
    }

    const highPass = env.ctx.createBiquadFilter();
    highPass.type = "highpass";
    highPass.frequency.value = bite.highPass;
    highPass.connect(next);

    return highPass;
}

function createLowPassNode(bite: SoundBite, env: AudioEnvironment, next: AudioNode) {
    if (!bite.lowPass) {
        return next;
    }

    const lowPass = env.ctx.createBiquadFilter();
    lowPass.type = "lowpass";
    lowPass.frequency.value = bite.lowPass;
    lowPass.connect(next);

    return lowPass;
}

function createSource(bite: SoundBite, env: AudioEnvironment, next: AudioNode) {
    const ctx = env.ctx;
    const t = ctx.currentTime;

    const startTime = bite.startTime || 0;
    const stopTime = bite.stopTime;

	if (bite.wave === "brown-noise") {
		var noise = ctx.createBufferSource();
		noise.buffer = env.brownNoise;

		noise.start(t + startTime);
		noise.stop(t + stopTime);
		noise.connect(next);
	} else {
        const ratios = bite.ratios || [];
        const startFreq = bite.startFreq || 440;
        const stopFreq = bite.stopFreq || 440;

		for (const ratio of ratios) {
			const osc = ctx.createOscillator();
			osc.type = bite.wave;

			osc.frequency.setValueAtTime(ratio * startFreq, t + startTime);
			osc.frequency.exponentialRampToValueAtTime(ratio * stopFreq, t + stopTime);

			osc.start(t + startTime);
			osc.stop(t + stopTime);

			osc.connect(next);
		}
    }
}