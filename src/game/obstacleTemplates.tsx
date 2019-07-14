import { TicksPerSecond, Categories, Pixel, Alliances } from './constants';

const ConveyorSpeed = 0.15;

export const volcano: ObstacleTemplate = {
    health: 50,

    collideWith: Categories.Hero,
    sensor: true,
    static: true,
    undamageable: true,

    render: [
        {
            type: "solid",
            color: "rgba(255, 0, 128, 0.9)",
            deadColor: "rgba(255, 0, 128, 0.25)",
            glow: 0.2,
            flash: true,
        },
        {
        type: "smoke",
            color: "rgba(255, 0, 128, 1)",
            particleRadius: 0.01,
            fade: "rgba(0, 0, 0, 0)",
            "ticks": 30,
            "interval": 8,
            "speed": 0.1
        }
    ],

    hitInterval: 15,
    damage: 5,
}

export const slow: ObstacleTemplate = {
    health: 50,

    collideWith: Categories.Hero,
    sensor: true,
    static: true,
    undamageable: true,

    render: [
        {
            type: "solid",
            "color": "rgba(64, 255, 255, 0.75)",
            deadColor: "rgba(64, 255, 255, 0.25)",
            glow: 0.2,
            flash: true,
        },
        {
            type: "smoke",
            "color": "rgba(64, 255, 255, 1)",
            particleRadius: 0.002,
            "fade": "rgba(64, 255, 255, 0)",
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
            movementProportion: 0.8,
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
    undamageable: true,

    render: [
        {
            type: "solid",
            "color": "rgba(255, 255, 64, 0.75)",
            deadColor: "rgba(255, 255, 64, 0.25)",
            glow: 0.2,
            flash: true,
        },
        {
            type: "smoke",
            "color": "rgba(255, 255, 64, 1)",
            particleRadius: 0.002,
            "fade": "rgba(255, 255, 64, 0)",
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
            movementProportion: 1.5,
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

export const conveyorBase: ObstacleTemplate = {
    health: 50,

    collideWith: Categories.Hero,
    sensor: true,
    static: true,
    undamageable: true,

    render: [
        {
            type: "solid",
            "color": "rgba(64, 64, 64, 0.75)",
            deadColor: "rgba(64, 64, 64, 0.25)",
            glow: 0.2,
            flash: true,
        },
        {
            type: "smoke",
            "color": "rgba(128, 128, 128, 1)",
            particleRadius: 0.002,
            "fade": "rgba(0, 0, 0, 0)",
            "ticks": 20,
            "interval": 4,
            speed: 0,
            conveyor: 0.25,
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

export const screen: ObstacleTemplate = {
    "health": 50,

    render: [
        {
            type: "solid",
            "color": "#0cf",
            strikeGrow: 0.005,
            flash: true,
        },
        {
            type: "solid",
            "color": "#222",
            strikeGrow: 0.005,
            expand: -0.002,
            flash: true,
        },
    ],

    static: true,
    collideWith: Categories.Projectile,
    mirror: true,
};

const shadow: SwatchFill = {
    type: "solid",
    color: 'rgba(0, 0, 0, 0.5)',
    shadow: true,
    expand: 0.003,
};

const defaultTemplate: ObstacleTemplate = {
    health: 50,

    render: [
        shadow,
        {
            type: "solid",
            color: '#ccc',
            deadColor: '#c33',
            strikeGrow: 0.005,
            flash: true,
        },
        {
            type: "solid",
            color: '#888',
            deadColor: '#822',
            expand: -0.005,
            strikeGrow: 0.005,
            flash: true,
        },
    ],
};

const explosive: ObstacleTemplate = {
    health: 50,
    density: 10,
    linearDamping: 1.5,

    render: [
        shadow,
        {
            type: "solid",
            color: "#fc0",
            deadColor: "#fc0",
            strikeGrow: 0.005,
            flash: true,
        },
        {
            type: "solid",
            color: "#c94",
            deadColor: "#fc8",
            expand: -0.002,
            strikeGrow: 0.005,
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

        sound: "explosive",
    },
};

const mirror: ObstacleTemplate = {
    "health": 50,

    render: [
        shadow,
        {
            type: "solid",
            "color": "#0cf",
            strikeGrow: 0.005,
            flash: true,
        },
        {
            type: "solid",
            "color": "#0ad",
            "deadColor": "#48f",
            "expand": -0.003,
            strikeGrow: 0.005,
            flash: true,
        },
    ],

    mirror: true,
};

const bumper: ObstacleTemplate = {
    "health": 50,

    sound: "bumper",
    render: [
        shadow,
        {
            type: "solid",
            color: "#fc0",
            strikeGrow: 0.005,
            flash: true,
        },
        {
            type: "solid",
            "color": "#c94",
            "deadColor": "#753",
            expand: -0.004,
            strikeGrow: 0.005,
            flash: true,
        },
    ],

    "impulse": 0.00015,
};

const spinner: ObstacleTemplate = {
    health: 100,

    render: [
        shadow,
        {
            type: "solid",
            color: '#ccc',
            deadColor: '#c33',
            strikeGrow: 0.005,
            flash: true,
        },
        {
            type: "solid",
            color: '#888',
            deadColor: '#822',
            expand: -0.005,
            strikeGrow: 0.005,
            flash: true,
        },
    ],

    angularDamping: 0.1,
};

export const ObstacleTemplates: ObstacleTemplateLookup = {
    default: defaultTemplate,
    explosive,
    bumper,
    mirror,
    spinner,
    screen,
    volcano,
    slow,
    fast,
    right,
    left,
    outward,
    inward,
};
