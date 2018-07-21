import { TicksPerSecond, Categories } from './constants';
import { HomingTargets } from './world.model';

export const Hero: HeroSettings = {
    MoveSpeedPerSecond: 0.1,
    Radius: 0.015,
    Density: 0.5,

    AngularDamping: 1,
    Damping: 3,

    AdditionalDamageMultiplier: 2.0,
    AdditionalDamagePower: 1.0,

    MaxHealth: 100,
    SeparationStrength: 0.01,

    TurnFractionPerTick: 0.05,
}

export const World: WorldSettings = {
    InitialRadius: 0.4,
    HeroLayoutRadius: 0.25,

    LavaDamagePerSecond: 15,
    ShrinkPerSecond: 0.0045,
    InitialShieldSeconds: 1.0,
}

export const Obstacle: ObstacleSettings = {
	Health: 50,
	AngularDamping: 10,
	LinearDamping: 2,
	Density: 100.0,
}

export const Choices: ChoiceSettings = {
	Keys: [
		"a", "s",
		null,
		"q", "w", "e", "r",
		null,
		"d", "f",
    ],
	Options: {
		"a": ["teleport", "thrust"],
		"s": ["shield", "icewall", "drain"],
		"q": ["fireball", "flamestrike"],
		"w": ["lightning", "link"],
		"e": ["homing", "boomerang", "gravity"],
		"r": ["meteor", "kamehameha", "supernova"],
		"d": ["bouncer", "firespray"],
		"f": ["scourge"],
	},
	Defaults: {
		"a": "teleport",
		"s": "shield",
		"q": "fireball",
		"w": "lightning",
		"e": "homing",
		"r": "meteor",
		"d": "bouncer",
		"f": "scourge",
	},
}

export const Layouts: Layout[] = [
    {
        obstacles: [
            {
                numObstacles: 2,
                layoutRadius: 0.07,
                layoutAngleOffset: 0.25 * Math.PI,
                numPoints: 4,
                extent: Hero.Radius * 1.5,
                orientationAngleOffset: 0.25 * Math.PI,
            },
            {
                numObstacles: 4,
                layoutRadius: 0.33,
                layoutAngleOffset: 0,
                numPoints: 4,
                extent: Hero.Radius * 1,
                orientationAngleOffset: 0.0 * Math.PI,
            },
        ],
    },
    {
        obstacles: [
            {
                numObstacles: 5,
                layoutRadius: 0.15,
                layoutAngleOffset: (1 / 5) * Math.PI,
                numPoints: 3,
                extent: Hero.Radius,
                orientationAngleOffset: Math.PI,
            },
        ],
    },
    {
        obstacles: [
            {
                numObstacles: 1,
                layoutRadius: 0,
                layoutAngleOffset: 0,
                numPoints: 10,
                extent: Hero.Radius * 2,
                orientationAngleOffset: 0,
            },
        ],
    },
    {
        obstacles: [
            {
                numObstacles: 5,
                layoutRadius: 0.32,
                layoutAngleOffset: 0,
                numPoints: 4,
                extent: Hero.Radius,
                orientationAngleOffset: (1 / 4) * Math.PI,
            },
            {
                numObstacles: 5,
                layoutRadius: 0.15,
                layoutAngleOffset: (1 / 5) * Math.PI,
                numPoints: 4,
                extent: Hero.Radius,
                orientationAngleOffset: (1 / 4) * Math.PI,
            },
        ],
    },
    {
        obstacles: [
            {
                numObstacles: 3,
                layoutRadius: 0.28,
                layoutAngleOffset: Math.PI,
                numPoints: 3,
                extent: Hero.Radius * 1.5,
                orientationAngleOffset: Math.PI,
            },
        ],
    },
    {
        obstacles: [
            {
                numObstacles: 15,
                layoutRadius: 0.35,
                layoutAngleOffset: (1 / 5) * Math.PI,
                numPoints: 3,
                extent: Hero.Radius,
                orientationAngleOffset: Math.PI,
            },
        ],
    },
];

export const move: Spell = {
    id: 'move',
    description: "",
    color: 'white',
    maxAngleDiff: 0.25 * 2 * Math.PI,
    interruptible: true,
    cooldown: 0,
    action: "move",
};
export const fireball: Spell = {
    id: 'fireball',
    description: "Quick cooldown and packs a punch. Good old trusty fireball.",
    action: "projectile",

    color: '#ff8800',
    icon: "thunderball",

    maxAngleDiff: 0.01 * 2 * Math.PI,
    cooldown: 1 * TicksPerSecond,

    projectile: {
        color: '#ff8800',

        density: 5,
        radius: 0.003,
        speed: 0.4,
        maxSpeed: 1.0,
        maxTicks: 1 * TicksPerSecond,
        damage: 5,
        explodeOn: Categories.All,

        render: "projectile",
        trailTicks: 30,
    },
};
export const flamestrike: Spell = {
    id: 'flamestrike',
    name: 'Boom',
    description: "It's slower than fireball - harder to aim, but does more damage.",
    action: "projectile",

    color: '#ff4400',
    icon: "burningDot",

    maxAngleDiff: 0.01 * 2 * Math.PI,
    cooldown: 1 * TicksPerSecond,

    projectile: {
        color: '#ff4400',

        density: 5,
        radius: 0.005,
        speed: 0.18,
        maxSpeed: 1.0,
        maxTicks: 2 * TicksPerSecond,
        damage: 10,
        explodeOn: Categories.All,

        detonate: {
            radius: 0.025,
            minImpulse: 0.00005,
            maxImpulse: 0.00005,
        },

        render: "projectile",
        trailTicks: 30,
    },
};
export const firespray: Spell = {
    id: 'firespray',
    name: 'Splatter',
    description: "Shoot a stream of fire in a wide arc. Get closer to focus all your damage onto one target.",
    action: "spray",

    color: '#ff0044',
    icon: "bubblingBeam",

    maxAngleDiff: 0.01 * 2 * Math.PI,
    cooldown: 10 * TicksPerSecond,

    intervalTicks: 2,
    lengthTicks: 20,

    jitterRatio: 0.4,

    projectile: {
        color: '#ff0044',

        density: 1,
        radius: 0.002,
        speed: 0.5,
        maxSpeed: 1.0,
        maxTicks: 0.25 * TicksPerSecond,
        damage: 2.5,
        explodeOn: Categories.All,

        render: "ray",
        trailTicks: 30,
    },
};
export const meteor: Spell = {
    id: 'meteor',
    description: "Send a giant meteor towards your enemies! Nothing stops a meteor.",
    action: "projectile",

    color: '#ff0000',
    icon: "cometSpark",

    maxAngleDiff: 0.01 * 2 * Math.PI,
    cooldown: 12 * TicksPerSecond,

    projectile: {
        color: '#ff0000',

        density: 100,
        radius: 0.03,
        speed: 0.2,
        maxSpeed: 0.4,
        maxTicks: 12 * TicksPerSecond,
        damage: 0,
        trailTicks: 15,
        categories: Categories.Projectile | Categories.Massive,
        explodeOn: Categories.Obstacle,

        render: "ball",
    },
};
export const kamehameha: Spell = {
    id: 'kamehameha',
    name: 'Acolyte Beam',
    description: "After a long charge time, unleash a beam so powerful it can wipe out a full-health enemy in seconds.",
    action: "spray",

    color: '#44ddff',
    icon: "glowingHands",

    maxAngleDiff: 0.01 * 2 * Math.PI,
    chargeTicks: 0.75 * TicksPerSecond,
    cooldown: 20 * TicksPerSecond,

    knockbackCancel: true,
    interruptible: true,
    jitterRatio: 0.0,

    intervalTicks: 0.1 * TicksPerSecond,
    lengthTicks: 3 * TicksPerSecond,

    projectile: {
        color: '#ffffff',

        density: 0.0001,
        radius: 0.005,
        speed: 3.0,
        maxTicks: 0.5 * TicksPerSecond,
        damage: 5,
        damageScaling: false,
        trailTicks: 1.0 * TicksPerSecond,
        explodeOn: Categories.All,

        render: "ray",
    },
};
export const lightning: Spell = {
    id: 'lightning',
    name: 'Repulsor',
    description: "Huge knockback, if your aim is good enough.",
    action: "projectile",

    color: '#00ddff',
    icon: "lightningHelix",

    maxAngleDiff: 0.01 * 2 * Math.PI,
    cooldown: 10 * TicksPerSecond,
    chargeTicks: 0.1 * TicksPerSecond,

    projectile: {
        color: '#00ddff',

        density: 3,
        radius: 0.0025,
        speed: 3.0,
        maxTicks: 0.5 * TicksPerSecond,
        damage: 0,
        explodeOn: Categories.All,

        render: "ray",
        trailTicks: 30,
    },
};
export const homing: Spell = {
    id: 'homing',
    name: 'Seeker',
    description: "Follows the enemy. High damage, but only if the enemy doesn't know how to dodge.",
    action: "projectile",

    color: '#44ffcc',
    icon: "boltSaw",

    cooldown: 20 * TicksPerSecond,
    maxAngleDiff: 0.01 * 2 * Math.PI,

    projectile: {
        color: '#44ffcc',

        density: 25,
        radius: 0.003,
        maxSpeed: 0.3,
        speed: 0.15,
        maxTicks: 6.0 * TicksPerSecond,
        damage: 10,
        explodeOn: Categories.All,

        homing: {
            turnRate: 2 * Math.PI,
            maxTurnProportion: 0.05,
        },

        trailTicks: 30,

        render: "projectile",
    },
};
export const boomerang: Spell = {
    id: 'boomerang',
    name: 'Orbiter',
    description: "Around and around you. Keep your enemies at a safe distance.",
    action: "projectile",

    color: '#ff00ff',
    icon: "boomerangSun",

    maxAngleDiff: 0.01 * 2 * Math.PI,
    cooldown: 20 * TicksPerSecond,

    projectile: {
        color: '#ff00ff',
        selfColor: true,

        density: 1,
        radius: 0.003,
        maxSpeed: 0.6,
        speed: 0.4,
        maxTicks: 6.0 * TicksPerSecond,
        damage: 10,
        explodeOn: Categories.Hero | Categories.Massive,

        homing: {
            turnRate: 0.02 * 2 * Math.PI,
            maxTurnProportion: 0.05,
            minDistanceToTarget: 0.075,
            targetType: HomingTargets.self,
        },

        trailTicks: 1 * TicksPerSecond,

        render: "projectile",
    },
};
export const link: Spell = {
    id: 'link',
    name: 'Grab',
    description: "Pull your enemy to you. All your attacks gain lifesteal for the duration of the link.",
    action: "projectile",

    color: '#0000ff',
    icon: "andromedaChain",

    maxAngleDiff: 0.01 * 2 * Math.PI,
    cooldown: 12 * TicksPerSecond,

    projectile: {
        color: '#4444ff',

        density: 0.001,
        radius: 0.005,
        speed: 0.25,
        maxSpeed: 1.0,
        maxTicks: 2.0 * TicksPerSecond,
        damage: 0,
        explodeOn: Categories.Hero,
        shieldTakesOwnership: false,

        link: {
            strength: 1.0 / TicksPerSecond,
            linkTicks: 2.0 * TicksPerSecond,
            lifeSteal: 0.5,
        },

        homing: {
            turnRate: 2 * Math.PI,
            afterTicks: 1.0 * TicksPerSecond,
            targetType: HomingTargets.self,
        },

        trailTicks: 1,

        render: "link",
    },
};
export const bouncer: Spell = {
    id: 'bouncer',
    description: "The more times this bounces, the more damage this does. Stay close to your enemy.",
    action: "projectile",

    color: '#88ee22',
    icon: "divert",

    maxAngleDiff: 0.01 * 2 * Math.PI,
    cooldown: 10 * TicksPerSecond,

    projectile: {
        color: '#88ee22',

        density: 2,
        radius: 0.001,
        speed: 0.75,
        maxSpeed: 1.0,
        maxTicks: 3.0 * TicksPerSecond,
        damage: 4,
        collideWith: Categories.All ^ Categories.Projectile,
        explodeOn: Categories.None,
        bounce: {
            damageFactor: 0.9,
        },

        render: "ray",
        trailTicks: 1.0 * TicksPerSecond,
    },
};
export const drain: Spell = {
    id: 'drain',
    name: 'Siphon',
    description: "Steal some life from another player. They probably didn't need it anyway.",
    action: "projectile",

    color: '#22ee88',
    icon: "energyBreath",

    maxAngleDiff: 0.01 * 2 * Math.PI,
    cooldown: 5 * TicksPerSecond,

    projectile: {
        color: '#22ee88',

        density: 2,
        radius: 0.002,
        speed: 0.2,
        maxSpeed: 0.4,
        maxTicks: 2.0 * TicksPerSecond,
        damage: 5,
        lifeSteal: 1.0,
        explodeOn: Categories.All,
        homing: {
            turnRate: 0,
            redirect: true,
        },

        render: "ray",
        trailTicks: 0.5 * TicksPerSecond,
    },
};
export const gravity: Spell = {
    id: 'gravity',
    name: 'Ensnare',
    description: "Hold an enemy in place while you unleash your volleys upon them.",
    action: "projectile",

    color: '#0ace00',
    icon: "atomicSlashes",

    maxAngleDiff: 0.01 * 2 * Math.PI,
    cooldown: 8 * TicksPerSecond,
    chargeTicks: 0.1 * TicksPerSecond,

    projectile: {
        color: '#0ace00',

        density: 0.0001,
        radius: 0.02,
        speed: 0.3,
        maxTicks: 8.0 * TicksPerSecond,
        damage: 0,
        collideWith: Categories.Hero | Categories.Massive,
        explodeOn: Categories.All,

        gravity: {
            strength: 0.001 / TicksPerSecond,
            ticks: 2.0 * TicksPerSecond,
            radius: 0.05,
            power: 1,
        },

        homing: {
            turnRate: 2 * Math.PI,
            targetType: HomingTargets.cursor,
            minDistanceToTarget: Hero.Radius / 2,
            speedWhenClose: 0,
        },

        render: "gravity",
        trailTicks: 0.25 * TicksPerSecond,
    },
};
export const supernova: Spell = {
    id: 'supernova',
    description: "A delayed explosion to knock back your enemies",
    action: "projectile",

    color: '#ffaa00',
    icon: "crownedExplosion",

    maxAngleDiff: 0.01 * 2 * Math.PI,
    cooldown: 12 * TicksPerSecond,

    projectile: {
        color: '#ffaa00',

        density: 5,
        radius: 0.001,
        speed: 0.3,
        maxSpeed: 1.0,
        maxTicks: 1.25 * TicksPerSecond,
        damage: 0,
        collideWith: Categories.None,
        explodeOn: Categories.None,

        detonate: {
            waitTicks: 0.5 * TicksPerSecond,
            radius: 0.05,
            minImpulse: 0.0002,
            maxImpulse: 0.0005,
        },

        render: "supernova",
        trailTicks: 30,
    },
};
export const scourge: Spell = {
    id: 'scourge',
    name: 'Overload',
    description: "Takes time to charge, but will send nearby enemies flying. Be careful though, each blast takes 10% off your health!",
    untargeted: true,

    radius: Hero.Radius * 4,
    chargeTicks: 0.5 * TicksPerSecond,
    cooldown: 10 * TicksPerSecond,
    interruptible: true,
    damage: 20,
    selfDamage: 10,
    damageScaling: false,
    minImpulse: 0.0002,
    maxImpulse: 0.0005,

    icon: "deadlyStrike",

    trailTicks: 30,
    color: '#ffcc00',

    action: "scourge",
};
export const shield: Spell = {
    id: 'shield',
    name: 'Reflect',
    description: "Reflect any projectiles. Reflected projectiles become your projectiles. Ineffective against area-of-effect spells.",
    untargeted: true,

    mass: 100000,
    maxTicks: 3 * TicksPerSecond,
    cooldown: 20 * TicksPerSecond,
    radius: Hero.Radius * 2,

    icon: "shieldReflect",

    color: '#3366ff',

    action: "shield",
};
export const icewall: Spell = {
    id: 'icewall',
    description: "Create a wall of ice to block projectiles or stop enemies getting away.",

    health: 50,
    maxRange: 0.25,
    maxTicks: 5 * TicksPerSecond,
    cooldown: 20 * TicksPerSecond,

    length: 0.005,
    width: 0.15,

    icon: "woodenFence",

    color: '#0088ff',

    action: "wall",
};
export const teleport: Spell = {
    id: 'teleport',
    name: 'Blink',
    description: "Teleport to a nearby location. Get close, or get away.",

    maxRange: 0.4,
    cooldown: 10 * TicksPerSecond,

    icon: "teleport",

    color: '#6666ff',

    action: "teleport",
};
export const thrust: Spell = {
    id: 'thrust',
    name: 'Charge',
    description: "Accelerate quickly, knocking away anything in your path.",

    maxAngleDiff: 0.01 * 2 * Math.PI,
    cooldown: 12 * TicksPerSecond,

    damage: 1,
    maxTicks: 0.4 * TicksPerSecond,
    speed: 1.0,

    icon: "fireDash",
    color: '#ff00cc',
    action: "thrust",
};

export const Spells = {
    move,
    fireball,
    flamestrike,
    firespray,
    meteor,
    gravity,
    link,
    kamehameha,
    lightning,
    homing,
    boomerang,
    bouncer,
    drain,
    icewall,
    scourge,
    shield,
    supernova,
    teleport,
    thrust,
};

export const Settings: AcolyteFightSettings = {
    Layouts,
    Hero,
    World,
    Obstacle,
    Spells,
    Choices,
};