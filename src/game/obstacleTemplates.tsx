import { TicksPerSecond, Categories, Pixel, Alliances } from './constants';

const ConveyorSpeed = 0.05;

export const volcano: ObstacleTemplate = {
    health: 50,

    collideWith: Categories.Hero | Categories.Obstacle,
    sensor: true,
    static: true,
    undamageable: true,

    strike: {
        ticks: 15,
        flash: true,
    },

    render: [
        {
            type: "solid",
            color: "rgba(255, 0, 128, 0.9)",
            deadColor: "rgba(255, 0, 128, 0.25)",
            glow: 0.2,
        },
        {
            type: "smoke",
            color: "rgba(255, 0, 128, 1)",
            particleRadius: 0.01,
            fade: "rgba(0, 0, 0, 0)",
            bloom: 0.01,
            glow: 0.05,
            "ticks": 30,
            "interval": 8,
            "speed": 0.1
        }
    ],

    hitInterval: 15,

    buffs: [
        {
            type: "burn",
            maxTicks: 15,
            collideWith: Categories.All,
            packet: { damage: 3, lifeSteal: 0, noKnockback: true, noHit: true, isLava: true, source: "lava" },
            hitInterval: 5,
            stack: "volcano",
            maxStacks: 1,
            render: {
                color: "#ff0088",
                alpha: 0.3,
                light: 1,
                ticks: 30,
                emissionRadiusFactor: 1,
                particleRadius: 0.005,
                shine: 0.2,
                glow: 1,
                vanish: 1,
            },
        },
    ],
}

export const healing: ObstacleTemplate = {
    health: 50,

    collideWith: Categories.Hero | Categories.Obstacle,
    sensor: true,
    static: true,
    undamageable: true,

    strike: {
        ticks: 15,
        flash: true,
    },

    hitInterval: 15,

    "selfDamage": 1,
    decayPerSecond: 2,
    "render": [
        {
            "type": "solid",
            "color": "#0f9e",
            "deadColor": "#0f94",
            "glow": 0.2,
        },
        {
            "type": "smoke",
            "color": "#0f9",
            "particleRadius": 0.005,
            "fade": "#0000",
            "bloom": 0.01,
            "glow": 0.05,
            "ticks": 30,
            "interval": 8,
            "speed": 0.1,
        }
    ],
    "buffs": [
        {
            "type": "burn",
            "maxTicks": 15,
            "collideWith": 65535,
            "packet": {
                "damage": -1,
                "lifeSteal": 0,
                "noKnockback": true,
                "noHit": true,
                "isLava": true
            },
            "hitInterval": 5,
            "stack": "healing",
            "maxStacks": 1,
        }
    ]
}

export const slow: ObstacleTemplate = {
    health: 50,

    collideWith: Categories.Hero,
    sensor: true,
    static: true,
    undamageable: true,

    strike: {
        ticks: 15,
        flash: true,
    },

    render: [
        {
            type: "solid",
            "color": "rgba(64, 255, 255, 0.75)",
            deadColor: "rgba(64, 255, 255, 0.25)",
            glow: 0.2,
            light: 0.9,
        },
        {
            type: "smoke",
            "color": "rgba(64, 255, 255, 1)",
            particleRadius: 0.002,
            bloom: 0.01,
            glow: 0.025,
            vanish: 1,
            "ticks": 15,
            "interval": 4,
            "speed": 0.05,
            light: 1,
        }
    ],

    hitInterval: 15,

    buffs: [
        {
            type: "movement",
            stack: "slow",
            maxStacks: 1,
            maxTicks: 15,
            movementProportion: 0.8,
            render: {
                color: "rgba(64, 255, 255, 1)",
                alpha: 0.3,
                ticks: 30,
                emissionRadiusFactor: 1,
                particleRadius: 0.01,
                shine: 0.2,
                glow: 0.7,
                bloom: 0,
                vanish: 1,
            },
        },
    ],
}

export const fast: ObstacleTemplate = {
    health: 50,

    collideWith: Categories.Hero,
    sensor: true,
    static: true,
    undamageable: true,

    strike: {
        ticks: 15,
        flash: true,
    },

    render: [
        {
            type: "solid",
            "color": "rgba(255, 255, 64, 0.75)",
            deadColor: "rgba(255, 255, 64, 0.25)",
            glow: 0.2,
            light: 0.9,
        },
        {
            type: "smoke",
            "color": "rgba(255, 255, 64, 1)",
            particleRadius: 0.002,
            bloom: 0.01,
            glow: 0.025,
            vanish: 1,
            "ticks": 15,
            "interval": 4,
            "speed": 0.05,
            light: 1,
        }
    ],

    hitInterval: 15,

    buffs: [
        {
            type: "movement",
            stack: "fast",
            maxStacks: 1,
            maxTicks: 15,
            movementProportion: 1.5,
            render: {
                color: "rgba(255, 255, 255, 1)",
				"alpha": 0.2,
                heroColor: true,
                ticks: 30,
                shine: 0.5,
                glow: 1,
                bloom: 0.03,
                vanish: 1,
                emissionRadiusFactor: 0,
                particleRadius: 0.0125,
            },
        },
    ],
}

export const conveyorBase: ObstacleTemplate = {
    health: 50,

    collideWith: Categories.Hero | Categories.Projectile | Categories.Obstacle | Categories.Shield,
    sensor: true,
    static: true,
    undamageable: true,

    render: [
        {
            type: "solid",
            "color": "rgba(64, 64, 64, 0.25)",
            deadColor: "rgba(64, 64, 64, 0.1)",
            glow: 0.2,
            light: 0.5,
        },
        {
            type: "smoke",
            "color": "rgba(255, 255, 255, 0.25)",
            particleRadius: 0.002,
            bloom: 0.01,
            glow: 0.025,
            vanish: 1,
            "ticks": 45,
            "interval": 6,
            speed: 0,
            conveyor: 1,
            light: 1,
        }
    ],
}

export const right: ObstacleTemplate = {
    ...conveyorBase,
    conveyor: {
        lateralSpeed: ConveyorSpeed,
    },
}
export const left: ObstacleTemplate = {
    ...conveyorBase,
    conveyor: {
        lateralSpeed: -ConveyorSpeed,
    },
}
export const outward: ObstacleTemplate = {
    ...conveyorBase,
    conveyor: {
        radialSpeed: ConveyorSpeed,
    },
}
export const inward: ObstacleTemplate = {
    ...conveyorBase,
    conveyor: {
        radialSpeed: -ConveyorSpeed,
    },
}

const shadow: SwatchFill = {
    type: "solid",
    color: "#0008",
    shadow: true,
    flash: false,
    expand: 0.003,
};
const outline: SwatchFill = {
    type: "solid",
    color: '#0008',
    flash: false,
    expand: 0.003,
};

const defaultTemplate: ObstacleTemplate = {
    health: 50,
    strike: {
        ticks: 6,
        flash: true,
        growth: 0.005,
    },

    render: [
        shadow,
        {
            type: "bloom",
            color: '#fff8',
            strikeOnly: true,
            bloom: 0.05,
        },
        outline,
        {
            type: "solid",
            color: '#ddd',
            deadColor: '#c33',
            gradient: 0.2,
        },
        {
            type: "solid",
            color: '#999',
            deadColor: '#822',
            gradient: 0.3,
            expand: -0.003,
        },
    ],
};

const lightweight: ObstacleTemplate = {
    health: 100,
    density: 5,
    linearDamping: 3,
    strike: {
        ticks: 6,
        flash: true,
        growth: 0.005,
    },

    render: [
        shadow,
        {
            type: "bloom",
            color: '#fff8',
            strikeOnly: true,
            bloom: 0.05,
        },
        outline,
        {
            type: "solid",
            color: '#eee',
            deadColor: '#c33',
            gradient: 0.2,
        },
        {
            type: "solid",
            color: '#aaa',
            deadColor: '#822',
            gradient: 0.3,
            expand: -0.003,
        },
    ],
};

const explosive: ObstacleTemplate = {
    health: 50,
    density: 10,
    linearDamping: 1.5,
    circularHitbox: true,

    strike: {
        ticks: 6,
        flash: true,
        growth: 0.005,
    },

    render: [
        shadow,
        outline,
        {
            type: "solid",
            color: "#fc0",
            deadColor: "#fc0",
        },
        {
            type: "solid",
            color: "#c94",
            deadColor: "#fc8",
            expand: -0.002,
        },
    ],

    expireOn: Categories.Hero,
    detonate: {
        damage: 0,
        minImpulse: 0.0002,
        maxImpulse: 0.0005,
        radius: 0.05,
        renderTicks: 30,

        sound: "explosive",
    },
};

const mirror: ObstacleTemplate = {
    "health": 50,

    strike: {
        ticks: 10,
        flash: true,
        growth: 0.005,
    },

    render: [
        shadow,
        {
            type: "bloom",
            color: '#0cf8',
            bloom: 0.05,
            strikeOnly: true,
        },
        outline,
        {
            type: "solid",
            "color": "#0cf",
            gradient: 0.2,
        },
        {
            type: "solid",
            "color": "#0ad",
            "deadColor": "#48f",
            gradient: 0.3,
            "expand": -0.003,
        },
    ],

    mirror: true,
};

const bumper: ObstacleTemplate = {
    "health": 50,

    strike: {
        ticks: 6,
        flash: true,
        growth: 0.01,
    },

    sound: "bumper",
    render: [
        shadow,
        {
            type: "bloom",
            color: "#fc08",
            bloom: 0.05,
            strikeOnly: true,
        },
        outline,
        {
            type: "solid",
            color: "#fc0",
            gradient: 0.2,
        },
        {
            type: "solid",
            "color": "#c94",
            "deadColor": "#753",
            gradient: 0.3,
            expand: -0.003,
        },
    ],

    "impulse": 0.00015,
};

const spinner: ObstacleTemplate = {
    health: 100,

    strike: {
        ticks: 6,
        flash: true,
        growth: 0.005,
    },

    render: [
        shadow,
        {
            type: "bloom",
            color: '#fff8',
            bloom: 0.05,
            strikeOnly: true,
        },
        outline,
        {
            type: "solid",
            color: '#ddd',
            deadColor: '#c33',
            gradient: 0.2,
        },
        {
            type: "solid",
            color: '#999',
            deadColor: '#822',
            gradient: 0.3,
            expand: -0.003,
        },
    ],

    angularDamping: 0.1,
};

export const ObstacleTemplates: ObstacleTemplateLookup = {
    default: defaultTemplate,
    explosive,
    lightweight,
    bumper,
    mirror,
    spinner,
    volcano,
    healing,
    slow,
    fast,
    right,
    left,
    outward,
    inward,
};