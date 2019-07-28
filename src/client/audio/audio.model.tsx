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
