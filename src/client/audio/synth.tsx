import { SampleRate } from './audio.model';

let brownNoise: AudioBuffer = null;

export function generate(bite: SoundBite, ctx: BaseAudioContext, next: AudioNode) {
    next = createAttackDecayNode(bite, ctx, next);
    next = createTremoloNode(bite, ctx, next);
    next = createHighPassNode(bite, ctx, next);
    next = createLowPassNode(bite, ctx, next);

    createSource(bite, ctx, next);
}

function generateBrownNoise(ctx: BaseAudioContext) {
	const bufferSize = 10 * SampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, SampleRate);
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

function createAttackDecayNode(bite: SoundBite, ctx: BaseAudioContext, next: AudioNode) {
    const t = ctx.currentTime;
    const startTime = bite.startTime || 0;
    const stopTime = bite.stopTime;
    const attack = bite.attack || 0.03;
    const decay = bite.decay || 0.03;
    const maxVolume = bite.volume || 1;

    const maxStartTime = t + startTime + attack;
    const maxStopTime = Math.max(maxStartTime, t + stopTime - decay);

    const volume = ctx.createGain();
    volume.gain.value = 0;
	volume.gain.setValueAtTime(0, t + startTime);
    volume.gain.linearRampToValueAtTime(maxVolume, maxStartTime);
    if (maxStopTime > maxStartTime) {
        volume.gain.linearRampToValueAtTime(maxVolume, maxStopTime);
    }
	volume.gain.linearRampToValueAtTime(0, t + stopTime);

    volume.connect(next);
    return volume;
}

function createTremoloNode(bite: SoundBite, ctx: BaseAudioContext, next: AudioNode) {
    if (!(bite.tremoloFreq && bite.tremoloStrength)) {
        return next;
    }

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

    return tremoloGain;
}

function createHighPassNode(bite: SoundBite, ctx: BaseAudioContext, next: AudioNode) {
    if (!bite.highPass) {
        return next;
    }

    const highPass = ctx.createBiquadFilter();
    highPass.type = "highpass";
    highPass.frequency.value = bite.highPass;
    highPass.connect(next);

    return highPass;
}

function createLowPassNode(bite: SoundBite, ctx: BaseAudioContext, next: AudioNode) {
    if (!bite.lowPass) {
        return next;
    }

    const lowPass = ctx.createBiquadFilter();
    lowPass.type = "lowpass";
    lowPass.frequency.value = bite.lowPass;
    lowPass.connect(next);

    return lowPass;
}


function createNormalizer(divisor: number, ctx: BaseAudioContext, next: AudioNode) {
    const normalizer = ctx.createGain();
    normalizer.gain.value = 1 / divisor;
    normalizer.connect(next);
    return normalizer;
}

function createSource(bite: SoundBite, ctx: BaseAudioContext, next: AudioNode) {
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
        noise.connect(next);
	} else {
        const ratios = bite.ratios || [1];
        const startFreq = bite.startFreq || 440;
        const stopFreq = bite.stopFreq || 440;

        const frequencyModulator = createFrequencyModulator(bite, ctx);
        next = createNormalizer(ratios.length, ctx, next); // Ensure volume is the same regardless of number of oscillators

        let ended = false;
		for (const ratio of ratios) {
			const osc = ctx.createOscillator();
			osc.type = bite.wave;

            osc.frequency.value = ratio * startFreq;
			osc.frequency.setValueAtTime(ratio * startFreq, t + startTime);
			osc.frequency.exponentialRampToValueAtTime(ratio * stopFreq, t + stopTime);

			osc.start(t + startTime);
			osc.stop(t + stopTime);

            osc.connect(next);
            
            if (frequencyModulator) {
                frequencyModulator.connect(osc.frequency);
            }
		}
    }
}

function createFrequencyModulator(bite: SoundBite, ctx: BaseAudioContext) {
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

        return modGain;
    } else {
        return null;
    }
}