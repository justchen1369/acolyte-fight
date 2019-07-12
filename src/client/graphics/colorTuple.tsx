import Color from 'color';

const parseCache = new Map<string, ColTuple>();

export type ColTupleData = [number, number, number, number]; // rgba - 0.0 to 1.0

export default class ColTuple {
    tuple: ColTupleData;

    constructor(tuple: ColTupleData) {
        this.tuple = tuple;
    }

    static parse(str: string): ColTuple {
        let col = parseCache.get(str);
        if (!col) {
            const color = Color(str).rgb();
            col = ColTuple.fromColor(color);
            parseCache.set(str, col);
        }
        return col.clone();
    }

    static fromColor(color: Color): ColTuple {
        const rgb = color.rgb();
        return new ColTuple([rgb.red() / 255, rgb.green() / 255, rgb.blue() / 255, rgb.alpha()]);
    }

    static hsl(h: number, s: number, l: number): ColTuple {
        return ColTuple.fromColor(Color.hsl(h, s, l));
    }

    get r(): number {
        return this.tuple[0];
    }

    set r(value: number) {
        this.tuple[0] = value;
    }

    get g(): number {
        return this.tuple[1];
    }

    set g(value: number) {
        this.tuple[1] = value;
    }

    get b(): number {
        return this.tuple[2];
    }

    set b(value: number) {
        this.tuple[2] = value;
    }

    get a(): number {
        return this.tuple[3];
    }

    set a(value: number) {
        this.tuple[3] = value;
    }

    alpha(value: number) {
        this.tuple[3] = value;
        return this;
    }

    toColor(): Color {
        return Color.rgb(this.tuple[0] * 255, this.tuple[1] * 255, this.tuple[2] * 255, this.tuple[3]);
    }

    clone(): ColTuple {
        return new ColTuple([this.tuple[0], this.tuple[1], this.tuple[2], this.tuple[3]]);
    }

    string(): string {
        return this.toColor().string();
    }

    mix(newCol: ColTuple, fraction: number) {
        this.tuple[0] = (1 - fraction) * this.tuple[0] + fraction * newCol.tuple[0];
        this.tuple[1] = (1 - fraction) * this.tuple[1] + fraction * newCol.tuple[1];
        this.tuple[2] = (1 - fraction) * this.tuple[2] + fraction * newCol.tuple[2];
        this.tuple[3] = (1 - fraction) * this.tuple[3] + fraction * newCol.tuple[3];
        return this;
    }

    lighten(fraction: number) {
        this.tuple[0] = (1 - fraction) * this.tuple[0] + fraction * 1;
        this.tuple[1] = (1 - fraction) * this.tuple[1] + fraction * 1;
        this.tuple[2] = (1 - fraction) * this.tuple[2] + fraction * 1;
        return this;
    }

    darken(fraction: number) {
        this.tuple[0] = (1 - fraction) * this.tuple[0] + fraction * 0;
        this.tuple[1] = (1 - fraction) * this.tuple[1] + fraction * 0;
        this.tuple[2] = (1 - fraction) * this.tuple[2] + fraction * 0;
        return this;
    }

    fade(fraction: number) {
        this.tuple[3] = (1 - fraction) * this.tuple[3] + fraction * 0;
        return this;
    }
}