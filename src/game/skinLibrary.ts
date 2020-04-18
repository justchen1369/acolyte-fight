import * as h from './character.model';

export const defaultSkin: h.Skin = {
    layers: [
        {
            body: {
                shape: { type: "circle" },
            },
            glyphs: [
                {
                    shape: {
                        type: "triangle",
                        peakSpan: 0,
                        indentSpan: 1 / 3.0,
                        indentRise: 4 / 3.0,
                    },
                    transform: {
                        height: 0.75,
                        width: 3,
                        rise: -0.25,
                    },
                },
            ],
        },
    ],
}