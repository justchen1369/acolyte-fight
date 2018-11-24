declare module "soundbank-reverb" {
    export default function ReverbNodeConstructor(ctx: AudioContext): ReverbNode;

    export interface ReverbNode extends AudioNode {
        time: number;
        wet: AudioParam;
        dry: AudioParam;
        filterType: ReverbFilterType;
        cutoff: AudioParam;
    }

    export type ReverbFilterType = "lowpass" | "highpass";
}