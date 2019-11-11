export interface Skin {
    body: Body;
    glyph: Glyph;
}

export interface Glyph extends Style {
    rise: number; // how far forward the arrowhead should go
    fall: number; // how far back the arrowhead should go
    extent: number; // how far to either side the arrowhead should go
}

export interface Body extends Style {
    numPoints: number;
}

export interface Style {
    fillMask?: string;
    strokeMask?: string;
    stroke?: number;
}