export interface Skin {
    body: Body;
    glyph: Glyph;
}

export interface Glyph extends Style {
    rise: number; // how far forward the tip arrowhead should go
    inflect: number; // how far forward the inside of tip of the arrowhead should go

    attack: number; // how far back the front of the wings of the arrowhead should go
    fall: number; // how far back the wings of the arrowhead should go
    span: number; // how far to either side the wings of the arrowhead should go
}

export interface Body extends Style {
    numPoints: number;
    bend: number; // 0-1 means inwards, 1+ means outwards
}

export interface Style {
    fillMask?: string;
    strokeMask?: string;
    stroke?: number;
}