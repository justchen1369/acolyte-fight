export const volcano: SwatchTemplate = {
    id: "volcano",
    fill: [
        {
            type: "fill",
            color: "rgba(255, 0, 128, 0.9)",
            glow: 0.2,
            flash: 1,
        },
    ],
    smoke: [{
        color: "rgba(255, 0, 128, 1)",
        fade: "rgba(0, 0, 0, 0)",
        "ticks": 15,
        "interval": 1,
        "speed": 0.1
    }],

    hitInterval: 15,
    damage: 5,
}

export const slow: SwatchTemplate = {
    id: "slow",
    fill: [
        {
            type: "fill",
            "color": "rgba(64, 255, 255, 0.75)",
            glow: 0.2,
            flash: 1,
        },
        {
            type: "axialPulse",
            "fromColor": "rgba(255, 255, 255, 0)",
            "toColor": "rgba(255, 255, 255, 0.25)",
            inwards: true,
            speed: 0.05,
            pulseWidth: 0.01,
        },
        {
            type: "axialPulse",
            "fromColor": "rgba(255, 255, 255, 0)",
            "toColor": "rgba(255, 255, 255, 0.25)",
            inwards: true,
            speed: 0.03,
            pulseWidth: 0.005,
        },
    ],

    hitInterval: 15,

    buffs: [
        {
            type: "movement",
            maxTicks: 15,
            movementProportion: 0.5,
            render: {
                color: "rgba(64, 255, 255, 1)",
                alpha: 0.3,
                ticks: 15,
                emissionRadiusFactor: 1,
                particleRadius: 0.01,
            },
        },
    ],
}

export const fast: SwatchTemplate = {
    id: "fast",
    fill: [
        {
            type: "fill",
            "color": "rgba(255, 255, 64, 0.75)",
            glow: 0.2,
            flash: 1,
        },
        {
            type: "axialPulse",
            "fromColor": "rgba(255, 255, 255, 0)",
            "toColor": "rgba(255, 255, 255, 0.25)",
            inwards: false,
            speed: 0.05,
            pulseWidth: 0.01,
        },
        {
            type: "axialPulse",
            "fromColor": "rgba(255, 255, 255, 0)",
            "toColor": "rgba(255, 255, 255, 0.25)",
            inwards: false,
            speed: 0.03,
            pulseWidth: 0.005,
        },
    ],

    hitInterval: 15,

    buffs: [
        {
            type: "movement",
            maxTicks: 15,
            movementProportion: 1.5,
            render: {
                color: "rgba(255, 255, 255, 1)",
                heroColor: true,
                alpha: 0.3,
                ticks: 15,
                emissionRadiusFactor: 0,
                particleRadius: 0.0125,
            },
        },
    ],
}

export const Swatches: SwatchTemplates = {
    fast,
    slow,
    volcano,
};