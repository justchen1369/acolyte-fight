export interface RenderSkinParams {
    bodyFill?: string;
    glyphFill?: string;
    outlineFill?: string;
    outlineProportion?: number;
}

export interface Skin {
    layers: Layer[];
}

export interface Layer {
    body: LayerBody;
    glyphs: LayerGlyph[];
}

export interface LayerBody {
    shape: Shape;
    transform?: Transform;
    // color: LayerColor;
}

export interface LayerColor {
    h: number;
    s: number;
    l: number;
}

export type Shape =
    Circle
    | Triangle

export interface Circle {
    type: "circle";
}

export interface Triangle {
    type: "triangle";

    peakPinch: number;
    peakBend?: number;

    indentRise: number;
    indentPinch: number;
    indentBend?: number;

    basePinch: number;
}

export interface Transform {
    height?: number;
    width?: number;
    rise?: number;
}

export interface LayerGlyph {
    shape: Shape;
    transform?: Transform;
}