export const SampleRate = 44100;

export interface AudioElement {
    id: string;
    sound: string;
	pos?: Vec2;
	intensity?: number;
}

export interface Vec2 {
    x: number;
    y: number;
}

export type Message =
    | ReadyRequest
    | ReadyResponse
    | CacheAudioRequest
    | CacheAudioResponse;

export interface MessageBase {
    key: "acolyte";
    id: number;
}

export interface ReadyRequest extends MessageBase {
    type: "readyRequest";
}

export interface ReadyResponse extends MessageBase {
    type: "readyResponse";
    offlineAvailable: boolean;
}

export interface CacheAudioRequest extends MessageBase {
    type: "cacheRequest";
    bite: SoundBite;
}

export interface CacheAudioResponse extends MessageBase {
    type: "cacheResponse";
    numberOfChannels: number;
    length: number;
    sampleRate: number;
    arrayBuffer: ArrayBuffer;
}