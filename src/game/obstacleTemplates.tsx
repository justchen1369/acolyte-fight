import { TicksPerSecond, Categories, Pixel, Alliances } from './constants';

export const ObstacleTemplates: ObstacleTemplateLookup = {
    default: {
        health: 50,

        color: '#888',
        stroke: '#ccc',
        strokeWidth: 0.005,

        deadColor: '#822',
        deadStroke: '#c33',

        expireOn: Categories.None,
    },
    explodingBarrel: {
        health: 50,

        "color": "#f0f",
        "stroke": "#f8f",
        "strokeWidth": 0.002,
        "deadColor": "#f8f",
        "deadStroke": "#fff",

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
        "color": "#0cf",
        "stroke": "#8cf",
        "strokeWidth": 0.003,
        "deadColor": "#48f",
        "deadStroke": "#48f",
        damageFrom: Categories.Massive,
        mirror: true,
    },
    bumper: {
        "health": 50,

        "strokeWidth": 0.008,

        "color": "#c94",
        "stroke": "#fc0",

        "deadColor": "#fc8",
        "deadStroke": "#fc0",

        "impulse": 0.00012,
    },
};
