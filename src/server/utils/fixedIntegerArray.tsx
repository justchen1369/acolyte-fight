const BytesPerInt = 4;

export class FixedIntegerArray {
    length: number;
    private buffer: Buffer;

    constructor(values: number[]) {
        const buffer = Buffer.alloc(values.length * BytesPerInt);
        for (let i = 0; i < values.length; ++i) {
            const value = values[i];
            buffer.writeInt32LE(value, i * BytesPerInt);
        }
        this.buffer = buffer;
        this.length = values.length;
    }

    at(index: number): number {
        if (0 <= index && index < this.length) {
            return this.buffer.readInt32LE(index * BytesPerInt);
        } else {
            return undefined;
        }
    }

    toArray(): number[] {
        const result = new Array<number>(this.length);
        for (let i = 0; i < this.length; ++i) {
            result[i] = this.at(i);
        }
        return result;
    }
}