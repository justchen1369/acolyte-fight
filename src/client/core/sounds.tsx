import * as pl from 'planck-js';
import * as w from '../../game/world.model';

const Z = -0.1;
const RefDistance = 0.1;

const Reverb = require('soundbank-reverb');

let ctx: AudioContext = null;
let brownNoise: AudioBuffer = null;
let reverb: any = null;
let following = new Array<PlayingRef>();

type NoiseType = "brown-noise";
type WaveType = OscillatorType | NoiseType;

interface Blast {
    posX: number;
    posY: number;
    follow: string;

	startTime: number;
	stopTime: number;

	startFreq: number;
    stopFreq: number;

    tremoloFreq?: number;
    tremoloStrength?: number;
	detune?: number;

	highPass?: number;
	lowPass?: number;

	attack: number;
	decay: number;

	wave: WaveType;
	ratios: number[];
}

interface PlayingRef {
    pan: PannerNode;
    volume: GainNode;
    expire: number;
    target: string;
}

export function init() {
    if (AudioContext) {
        ctx = new AudioContext();
        brownNoise = generateBrownNoise();

        reverb = createReverb(ctx);
        reverb.connect(ctx.destination);

        ctx.listener.setPosition(0.5, 0.5, 0);
        ctx.listener.setOrientation(0, 0, -1, 0, 1, 0);
    }
}

export function play(world: w.World, self: string, sounds: w.Sound[]) {
    if (!ctx) { return; }

    const hero = world.objects.get(self);
    const pos = hero ? hero.body.getPosition() : pl.Vec2(0.5, 0.5);
    ctx.listener.setPosition(pos.x, pos.y, 0);

    for (const sound of sounds) {
        playSound(sound);
    }

    const keep = new Array<PlayingRef>();
    for (const item of following) {
        if (ctx.currentTime > item.expire) {
            continue;
        }

        const obj = world.objects.get(item.target);
        if (obj) {
            const pos = obj.body.getPosition();
            item.pan.setPosition(pos.x, pos.y, Z);
            keep.push(item);
        } else {
            const current = item.volume.gain.value;
            item.volume.gain.cancelScheduledValues(ctx.currentTime);
            item.volume.gain.setValueAtTime(current, ctx.currentTime);
            item.volume.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);
        }
    }
    following = keep;
}

function playSound(sound: w.Sound) {
    if (!ctx) { return; }

    switch (sound.id) {
        case "fireball-flight": return playFireballFlight(sound);
        case "fireball-hit": return playFireballHit(sound);

        case "flamestrike-flight": return playFireboomFlight(sound);
        case "flamestrike-destroyed": return playFireboomHit(sound);

        case "lightning-start": return playLightningStart(sound);

        case "bouncer-start": return playBouncerStart(sound);
        case "bouncer-hit": return playBouncerHit(sound);

        case "homing-flight": return playHomingFlight(sound);
        case "homing-hit": return playFireballHit(sound);

        case "boomerang-flight": return playOrbiterFlight(sound);
        case "boomerang-hit": return playFireballHit(sound);

        case "meteor-start": return playMeteorStart(sound);
        case "meteor-flight": return playMeteorFlight(sound);

        case "kamehameha-charging": return playBeamCharge(sound);
        case "kamehameha-casting": return playBeamStart(sound);
        case "kamehameha-flight": return playBeamFlight(sound);
    }
}

function playJoin(sound: w.Sound) {
	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 1,
		attack: 0.25,
		decay: 0.75,

		startFreq: 75,
		stopFreq: 376,
		lowPass: 80,

		wave: "sine",

		ratios: [1, 2.732, 4.178239, 8.791763, 16.731, 32.32917],
	});
}

function playLightningStart(sound: w.Sound) {
	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 0.3,
		attack: 0.001,
		decay: 0.29,

		startFreq: 4500,
		stopFreq: 5000,

		wave: "sawtooth",
		ratios: [1, 1.33, 1.5, 1.78, 2, 2.67, 3, 3.56],
	});

	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 0.7,
		attack: 0.001,
		decay: 0.69,

		startFreq: 40,
		stopFreq: 20,
		lowPass: 200,

		wave: "triangle",
		ratios: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9],
	});
}

function playForcefieldStart(sound: w.Sound) {
	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 3,
		attack: 0.1,
		decay: 2.9,

		startFreq: 100,
		stopFreq: 100,
		lowPass: 100,

		wave: "square",

		ratios: [1, 2, 3, 4, 5, 6, 7, 8],
	});
}

function playForcefieldHit(sound: w.Sound) {
	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 0.05,
		attack: 0.01,
		decay: 0.04,

		startFreq: 102,
		stopFreq: 100,
		lowPass: 100,

		wave: "square",

		ratios: [1, 2, 3, 4, 5, 6, 7, 8],
	});
}

function playBouncerStart(sound: w.Sound) {
	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 0.5,
		attack: 0.1,
		decay: 0.4,

		startFreq: 8900,
		stopFreq: 8100,
		lowPass: 9000,

		wave: "square",

		ratios: [1, 1.33, 1.5, 2, 2.67, 3, 4],
	});
}

function playBouncerHit(sound: w.Sound) {
	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 0.5,
		attack: 0.001,
		decay: 0.49,

		startFreq: 8100,
		stopFreq: 8500,
		lowPass: 9000,

		wave: "square",

		ratios: [1, 1.33, 1.5, 2, 2.67, 3, 4],
	});
}

function playFireballFlight(sound: w.Sound) {
	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 2,
		attack: 0.25,
		decay: 0.75,

		highPass: 1000,
		lowPass: 1000,

		wave: "brown-noise",
    });
	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 1.5,
		attack: 0.25,
		decay: 0.25,

		startFreq: 20,
		stopFreq: 10,
		highPass: 432,
		lowPass: 432,

		wave: "square",

		ratios: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2],
    });

}

function playFireballHit(sound: w.Sound) {
	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 0.75,
		attack: 0.01,
		decay: 0.70,

		startFreq: 150,
		stopFreq: 0.01,
		lowPass: 500,

		wave: "triangle",

		ratios: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2],
	});
}

function playFireboomFlight(sound: w.Sound) {
	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 1.5,
		attack: 0.25,
		decay: 0.25,

		highPass: 300,
		lowPass: 303,

		wave: "brown-noise",
	});
}

function playFireboomHit(sound: w.Sound) {
	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 2,
		attack: 0.01,
		decay: 1.95,

		startFreq: 100,
		stopFreq: 0.01,
		lowPass: 300,

		wave: "triangle",

		ratios: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2],
	});
}

function playHomingFlight(sound: w.Sound) {
	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 1.5,
		attack: 0.25,
		decay: 0.25,

		highPass: 300,
		lowPass: 318,

		wave: "brown-noise",
    });

	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 1.5,
		attack: 0.5,
		decay: 1.0,

		startFreq: 200,
		stopFreq: 203,
		lowPass: 250,

		tremoloFreq: 4,
		tremoloStrength: 0.2,

		wave: "sine",

		ratios: [1, 2, 2.75, 4, 5.5],
	});

}

function playOrbiterFlight(sound: w.Sound) {
	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 1.5,
		attack: 0.25,
		decay: 0.5,

		startFreq: 55,
		stopFreq: 55.5,
        lowPass: 75,

		tremoloFreq: 7,
		tremoloStrength: 0.3,

		wave: "sine",

		ratios: [1, 1.5, 2, 2.75, 4, 5.5],
    });

	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 1.5,
		attack: 0.25,
		decay: 0.25,

		highPass: 495,
		lowPass: 525,

		wave: "brown-noise",
	});

}

function playBeamCharge(sound: w.Sound) {
	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 0.75,
		attack: 0.70,
		decay: 0.05,

		startFreq: 4,
		stopFreq: 19,

		wave: "triangle",

		ratios: [1, 2, 2.5, 4, 5, 8, 10, 16],
	});
}

function playBeamStart(sound: w.Sound) {
	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 0.25,
		attack: 0.05,
		decay: 0.20,

		startFreq: 40,
		stopFreq: 18,

		wave: "triangle",

		ratios: [1, 2, 4],
	});
}

function playBeamFlight(sound: w.Sound) {
	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 0.25,
		attack: 0.1,
		decay: 0.15,

		startFreq: 18,
		stopFreq: 18.1,
		lowPass: 200,

		wave: "triangle",

		ratios: [1, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96],
	});

	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 0.25,
		attack: 0.1,
		decay: 0.15,

		startFreq: 18,
		stopFreq: 17.9,
		lowPass: 200,

		wave: "square",

		ratios: [1, 2, 2.16, 4, 4.16, 8, 16],
	});
}

function playMeteorStart(sound: w.Sound) {
	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 1.0,
		attack: 0.1,
		decay: 0.9,

		startFreq: 20,
		stopFreq: 1,
		lowPass: 300,

		wave: "square",

		ratios: [1, 2, 3, 4, 5, 6, 7, 8],
	});
}

function playMeteorFlight(sound: w.Sound) {
	blaster({
        posX: sound.pos.x,
        posY: sound.pos.y,
        follow: sound.follow,

		stopTime: 2,
		attack: 0.5,
		decay: 1.0,

		startFreq: 1,
		stopFreq: 10,
		lowPass: 100,

		wave: "square",

		ratios: [1, 1.5, 2, 2.1, 2.16, 3.5, 6.7, 8.2],
	});
}

function blaster(blastConfig: Partial<Blast>) {
	const blast: Blast = {
        posX: 0.5,
        posY: 0.5,
        follow: null,

		startTime: 0,
		stopTime: 0,

		startFreq: 440,
		stopFreq: 440,

		attack: 0.03,
		decay: 0.03,

		wave: 'sine',
		ratios: [1],
		...blastConfig,
	};
	const t = ctx.currentTime;

    let next: AudioNode = reverb;
    
    // Position
    const pan = ctx.createPanner();
    pan.panningModel = 'HRTF';
    pan.refDistance = RefDistance;
    pan.setPosition(blast.posX, blast.posY, Z);
    pan.setOrientation(0, 0, 1);
    pan.connect(next);
    next = pan;

	// Volume envelope
	const volume = ctx.createGain();
	volume.gain.setValueAtTime(0, t + blast.startTime);
	volume.gain.linearRampToValueAtTime(1, t + blast.startTime + blast.attack);
	volume.gain.linearRampToValueAtTime(1, t + blast.stopTime - blast.decay);
	volume.gain.linearRampToValueAtTime(0, t + blast.stopTime);

	volume.connect(next);
    next = volume;
    
    // Tremolo
	if (blast.tremoloFreq && blast.tremoloStrength) {
        const tremeloGain = createTremolo(blast.tremoloFreq, blast.tremoloStrength, blast.startTime, blast.stopTime);
        tremeloGain.connect(next);
        next = tremeloGain;
	}


	// Passing filters
	if (blast.highPass) {
		const highPass = ctx.createBiquadFilter();
		highPass.type = "highpass";
		highPass.frequency.value = blast.highPass;

		highPass.connect(next);
		next = highPass;
	}
	if (blast.lowPass) {
		const lowPass = ctx.createBiquadFilter();
		lowPass.type = "lowpass";
		lowPass.frequency.value = blast.lowPass;

		lowPass.connect(next);
		next = lowPass;
	}

	// Oscillators
	if (blast.wave === "brown-noise") {
		var noise = ctx.createBufferSource();
		noise.buffer = brownNoise;

		noise.start(t + blast.startTime);
		noise.stop(t + blast.stopTime);
		noise.connect(next);
	} else {
		const normalizer = ctx.createGain();
		normalizer.gain.setValueAtTime(1 / blast.ratios.length, t);
		normalizer.connect(next);
		next = normalizer;

		for (const ratio of blast.ratios) {
			const osc = ctx.createOscillator();
			osc.type = blast.wave;
			if (blast.detune) {
				osc.detune.setValueAtTime(blast.detune, t + blast.startTime);
			}

			osc.frequency.setValueAtTime(ratio * blast.startFreq, t + blast.startTime);
			osc.frequency.exponentialRampToValueAtTime(ratio * blast.stopFreq, t + blast.stopTime);

			osc.start(t + blast.startTime);
			osc.stop(t + blast.stopTime);

			osc.connect(next);
		}
    }

    if (blast.follow) {
        following.push({
            pan,
            volume,
            target: blast.follow,
            expire: t + blast.stopTime,
        });
    }
}

function createTremolo(tremeloFreq: number, tremeloStrength: number, startTime: number, stopTime: number) {
		const tremeloGain = ctx.createGain();
		tremeloGain.gain.setValueAtTime(1 - tremeloStrength, 0);

		const oscGain = ctx.createGain();
		oscGain.gain.setValueAtTime(tremeloStrength, 0);
		oscGain.connect(tremeloGain.gain);

		const tremeloOsc = ctx.createOscillator();
		tremeloOsc.frequency.setValueAtTime(tremeloFreq, 0);
		tremeloOsc.start(ctx.currentTime + startTime);
		tremeloOsc.stop(ctx.currentTime + stopTime);
		tremeloOsc.connect(oscGain);

		return tremeloGain;
}

function generateBrownNoise() {
	const bufferSize = 10 * ctx.sampleRate;
	const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
	const output = noiseBuffer.getChannelData(0);

	let lastOut = 0.0;
	for (var i = 0; i < bufferSize; i++) {
		var white = Math.random() * 2 - 1;
		output[i] = (lastOut + (0.02 * white)) / 1.02;
		lastOut = output[i];
		output[i] *= 3.5; // (roughly) compensate for gain
	}
	return noiseBuffer;
}

function createReverb(ctx: AudioContext) {
    const reverb = Reverb(ctx);

    reverb.time = 1 //seconds
    reverb.wet.value = 0.8
    reverb.dry.value = 1

    reverb.filterType = 'lowpass'
    reverb.cutoff.value = 4000 //Hz

    return reverb;
}

init();
(window as any).play = play;
