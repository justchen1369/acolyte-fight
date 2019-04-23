import { TicksPerSecond, Categories, Pixel, Alliances } from './constants';

export const ObstacleTemplates: ObstacleTemplateLookup = {
    default: {
        health: 50,

        color: '#888',
        stroke: '#ccc',
        strokeWidth: 0.005,

        deadColor: '#822',
        deadStroke: '#c33',
    },
    explodingBarrel: {
        health: 50,

        "strokeWidth": 0.002,

        "color": "#c94",
        "stroke": "#fc0",
        "deadColor": "#fc8",
        "deadStroke": "#fc0",

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
        "color": "#0ad",
        "stroke": "#0cf",
        "strokeWidth": 0.003,
        "deadColor": "#48f",
        "deadStroke": "#48f",
        damageFrom: Categories.Massive,
        mirror: true,
    },
    bumper: {
        "health": 50,

        "strokeWidth": 0.004,

        "color": "#c94",
        "stroke": "#fc0",

        "deadColor": "#fc8",
        "deadStroke": "#fc0",

        "impulse": 0.00015,
    },
    heavy: {
        health: 1000,

        "color": "#555",
        "stroke": "#fff",
        strokeWidth: 0.01,

        deadColor: '#822',
        deadStroke: '#c33',

        linearDamping: 100,
        angularDamping: 0.1,
    },
};
