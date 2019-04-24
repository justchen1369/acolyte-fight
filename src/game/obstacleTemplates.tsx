import { TicksPerSecond, Categories, Pixel, Alliances } from './constants';

export const volcano: ObstacleTemplate = {
    health: 50,

    collideWith: Categories.Hero,
    sensor: true,
    static: true,

    fill: [
        {
            type: "fill",
            color: "rgba(255, 0, 128, 0.9)",
            deadColor: "rgba(255, 0, 128, 0.25)",
            glow: 0.2,
            flash: true,
        },
    ],
    smoke: [{
        color: "rgba(255, 0, 128, 1)",
        fade: "rgba(0, 0, 0, 0)",
        "ticks": 30,
        "interval": 8,
        "speed": 0.1
    }],

    hitInterval: 15,
    damage: 5,
}

export const slow: ObstacleTemplate = {
    health: 50,

    collideWith: Categories.Hero,
    sensor: true,
    static: true,

    fill: [
        {
            type: "fill",
            "color": "rgba(64, 255, 255, 0.75)",
            deadColor: "rgba(64, 255, 255, 0.25)",
            glow: 0.2,
            flash: true,
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
    "smoke": [
        {
            "color": "rgba(64, 255, 255, 1)",
            "fade": "rgba(0, 0, 0, 0)",
            "ticks": 15,
            "interval": 4,
            "speed": 0.05
        }
    ],

    hitInterval: 15,

    buffs: [
        {
            type: "movement",
            maxTicks: 15,
            movementProportion: 0.67,
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

export const fast: ObstacleTemplate = {
    health: 50,

    collideWith: Categories.Hero,
    sensor: true,
    static: true,

    fill: [
        {
            type: "fill",
            "color": "rgba(255, 255, 64, 0.75)",
            deadColor: "rgba(255, 255, 64, 0.25)",
            glow: 0.2,
            flash: true,
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
    "smoke": [
        {
            "color": "rgba(255, 255, 64, 1)",
            "fade": "rgba(0, 0, 0, 0)",
            "ticks": 15,
            "interval": 4,
            "speed": 0.05
        }
    ],

    hitInterval: 15,

    buffs: [
        {
            type: "movement",
            maxTicks: 15,
            movementProportion: 1.33,
            render: {
                color: "rgba(255, 255, 255, 1)",
                heroColor: true,
                alpha: 0.3,
                ticks: 30,
                emissionRadiusFactor: 0,
                particleRadius: 0.0125,
            },
        },
    ],
}

export const ObstacleTemplates: ObstacleTemplateLookup = {
    default: {
        health: 50,

        fill: [
            {
                type: "fill",
                color: '#ccc',
                deadColor: '#c33',
                flash: true,
            },
            {
                type: "fill",
                color: '#888',
                deadColor: '#822',
                expand: -0.005,
                flash: true,
            },
        ],
    },
    explodingBarrel: {
        health: 50,

        fill: [
            {
                type: "fill",
                color: "#fc0",
                deadColor: "#fc0",
                flash: true,
            },
            {
                type: "fill",
                color: "#c94",
                deadColor: "#fc8",
                expand: -0.002,
                flash: true,
            },
        ],

        expireOn: Categories.Hero,
        detonate: {
            damage: 0,
            minImpulse: 0.0002,
            maxImpulse: 0.0005,
            radius: 0.05,
            renderTicks: 30,
        },
    },
    "mirror": {
        "health": 50,

        fill: [
            {
                type: "fill",
                "color": "#0cf",
                flash: true,
            },
            {
                type: "fill",
                "color": "#0ad",
                "deadColor": "#48f",
                "expand": -0.003,
                flash: true,
            },
        ],

        mirror: true,
    },
    bumper: {
        "health": 50,

        fill: [
            {
                type: "fill",
                color: "#fc0",
                flash: true,
            },
            {
                type: "fill",
                "color": "#c94",
                "deadColor": "#753",
                expand: -0.004,
                flash: true,
            },
        ],

        "impulse": 0.00015,
    },
    heavy: {
        health: 1000,

        fill: [
            {
                type: "fill",
                color: "#fff",
                deadColor: '#c33',
                flash: true,
            },
            {
                type: "fill",
                color: "#555",
                deadColor: '#822',
                expand: -0.01,
                flash: true,
            },
        ],

        linearDamping: 100,
        angularDamping: 0.1,
    },
    volcano,
    slow,
    fast,
};
