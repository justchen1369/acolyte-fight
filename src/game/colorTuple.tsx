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
            const color = Color(str || '#0000').rgb();
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
        function hue2rgb(p: number, q: number, t: number) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        return new ColTuple([
            hue2rgb(p, q, h + 1/3),
            hue2rgb(p, q, h),
            hue2rgb(p, q, h - 1/3),
            1.0,
        ]);
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
        return `rgba(${Math.round(this.r * 255)}, ${Math.round(this.g * 255)}, ${Math.round(this.b * 255)}, ${(this.a).toFixed(2)})`;
    }

    mix(newCol: ColTuple, fraction: number) {
        this.tuple[0] = (1 - fraction) * this.tuple[0] + fraction * newCol.tuple[0];
        this.tuple[1] = (1 - fraction) * this.tuple[1] + fraction * newCol.tuple[1];
        this.tuple[2] = (1 - fraction) * this.tuple[2] + fraction * newCol.tuple[2];
        this.tuple[3] = (1 - fraction) * this.tuple[3] + fraction * newCol.tuple[3];
        return this;
    }

    colorize(newCol: ColTuple, fraction: number) {
        this.tuple[0] = (1 - fraction) * this.tuple[0] + fraction * newCol.tuple[0];
        this.tuple[1] = (1 - fraction) * this.tuple[1] + fraction * newCol.tuple[1];
        this.tuple[2] = (1 - fraction) * this.tuple[2] + fraction * newCol.tuple[2];
        // Don't change alpha
        return this;
    }

    add(newCol: ColTuple, fraction: number) {
        this.tuple[0] += Math.min(1.0, fraction * newCol.tuple[0]);
        this.tuple[1] += Math.min(1.0, fraction * newCol.tuple[1]);
        this.tuple[2] += Math.min(1.0, fraction * newCol.tuple[2]);
        // Don't change alpha
        return this;
    }

    adjust(fraction: number) {
        if (fraction > 0) {
            return this.lighten(fraction);
        } else if (fraction < 0) {
            return this.darken(-fraction);
        } else {
            return this;
        }
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