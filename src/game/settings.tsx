import _ from 'lodash';
import { TicksPerSecond, Categories } from './constants';
import { Actions, HomingTargets } from './world.model';

const Hero: HeroSettings = {
    MoveSpeedPerSecond: 0.1,
    Radius: 0.015,
    Density: 0.5,

    AngularDamping: 1,
    Damping: 3,

    AdditionalDamageMultiplier: 2.0,
    AdditionalDamagePower: 1.0,

    MaxHealth: 100,
    SeparationImpulsePerTick: 0.01,

    RevolutionsPerTick: 0.05,
    MaxDashRange: 0.25,
    DashRangeCostBase: 0.125,
    DashCooldownTicks: 12 * TicksPerSecond,
}

const World: WorldSettings = {
    InitialRadius: 0.4,
    HeroLayoutRadius: 0.25,

    LavaDamagePerSecond: 15,
    SecondsToShrink: 90,
    ShrinkPower: 1.4,
    InitialShieldSeconds: 1.0,

    ProjectileSpeedDecayFactorPerTick: 0.05,
    ProjectileSpeedMaxError: 0.001,
}

const Obstacle: ObstacleSettings = {
	Health: 50,
	AngularDamping: 5,
	LinearDamping: 2,
	Density: 100.0,
}

const Choices: ChoiceSettings = {
	Keys: [
        { btn: "d", primary: false },
        null,
        { btn: "q", primary: true },
        { btn: "w", primary: true },
        { btn: "e", primary: true },
        { btn: "r", primary: true },
		null,
        { btn: "f", primary: false },
    ],
	Options: {
		[Actions.RightClick]: ["thrust", "teleport"],
		"d": ["shield", "icewall", "drain"],
		"q": ["fireball", "flamestrike"],
		"w": ["link", "lightning", "gravity"],
		"e": ["homing", "boomerang"],
		"r": ["kamehameha", "meteor", "supernova"],
		"f": ["firespray", "bouncer", "scourge"],
	},
	Defaults: {
		[Actions.RightClick]: "thrust",
		"d": "shield",
		"q": "fireball",
		"w": "link",
		"e": "homing",
		"r": "kamehameha",
		"f": "firespray",
	},
}

const Layouts: Layouts = {
    "double": {
        obstacles: [
            {
                numObstacles: 2,
                layoutRadius: 0.07,
                layoutAngleOffsetInRevs: 0.125,
                numPoints: 4,
                extent: Hero.Radius * 1.5,
                orientationAngleOffsetInRevs: 0.125,
            },
            {
                numObstacles: 4,
                layoutRadius: 0.33,
                layoutAngleOffsetInRevs: 0,
                numPoints: 4,
                extent: Hero.Radius * 1,
                orientationAngleOffsetInRevs: 0,
            },
        ],
    },
    "inside5": {
        obstacles: [
            {
                numObstacles: 5,
                layoutRadius: 0.15,
                layoutAngleOffsetInRevs: 0.5 * (1 / 5),
                numPoints: 3,
                extent: Hero.Radius,
                orientationAngleOffsetInRevs: 0.5,
            },
        ],
    },
    "single": {
        obstacles: [
            {
                numObstacles: 1,
                layoutRadius: 0,
                layoutAngleOffsetInRevs: 0,
                numPoints: 10,
                extent: Hero.Radius * 2,
                orientationAngleOffsetInRevs: 0,
            },
        ],
    },
    "pepper": {
        obstacles: [
            {
                numObstacles: 5,
                layoutRadius: 0.32,
                layoutAngleOffsetInRevs: 0,
                numPoints: 4,
                extent: Hero.Radius,
                orientationAngleOffsetInRevs: 0.5 * (1 / 4),
            },
            {
                numObstacles: 5,
                layoutRadius: 0.15,
                layoutAngleOffsetInRevs: 0.5 * (1 / 5),
                numPoints: 4,
                extent: Hero.Radius,
                orientationAngleOffsetInRevs: 0.5 * (1 / 4),
            },
        ],
    },
    "triplet": {
        obstacles: [
            {
                numObstacles: 3,
                layoutRadius: 0.28,
                layoutAngleOffsetInRevs: 0.5,
                numPoints: 3,
                extent: Hero.Radius * 1.5,
                orientationAngleOffsetInRevs: 0.5,
            },
        ],
    },
    "surrounded": {
        obstacles: [
            {
                numObstacles: 15,
                layoutRadius: 0.35,
                layoutAngleOffsetInRevs: 0.5 * (1 / 5),
                numPoints: 3,
                extent: Hero.Radius,
                orientationAngleOffsetInRevs: 0.5,
            },
        ],
    },
};

const move: Spell = {
    id: 'move',
    description: "",
    color: 'white',
    maxAngleDiffInRevs: 0.25,
    interruptible: true,
    cooldown: 0,
    action: "move",
};
const retarget: Spell = {
    id: 'retarget',
    description: "",
    color: 'white',
    maxAngleDiffInRevs: 1.0,
    interruptible: true,
    cooldown: 0,
    action: "retarget",
};
const stop: Spell = {
    id: 'stop',
    description: "",
    color: 'white',
    maxAngleDiffInRevs: 1.0,
    interruptible: true,
    cooldown: 0,
    action: "stop",
};
const fireball: Spell = {
    id: 'fireball',
    description: "Quick cooldown and packs a punch. Good old trusty fireball.",
    action: "projectile",

    color: '#ff8800',
    icon: "thunderball",

    maxAngleDiffInRevs: 0.01,
    cooldown: 1.5 * TicksPerSecond,

    projectile: {
        color: '#ff8800',

        density: 10,
        radius: 0.003,
        speed: 0.5,
        maxTicks: 1 * TicksPerSecond,
        damage: 5,
        categories: Categories.Projectile,

        render: "projectile",
        trailTicks: 30,
    },
};
const flamestrike: Spell = {
    id: 'flamestrike',
    name: 'Fireboom',
    description: "It's slower than fireball - harder to aim, but does more damage.",
    action: "projectile",

    color: '#ff4400',
    icon: "burningDot",

    maxAngleDiffInRevs: 0.01,
    cooldown: 1.5 * TicksPerSecond,

    projectile: {
        color: '#ff4400',

        density: 5,
        radius: 0.005,
        speed: 0.18,
        maxTicks: 2 * TicksPerSecond,
        damage: 0,
        categories: Categories.Projectile,

        detonate: {
            damage: 10,
            radius: 0.025,
            minImpulse: 0.00005,
            maxImpulse: 0.00005,
        },

        render: "projectile",
        trailTicks: 30,
    },
};
const firespray: Spell = {
    id: 'firespray',
    name: 'Firesplatter',
    description: "Shoot a stream of fire in a wide arc. Get closer to focus all your damage onto one target.",
    action: "spray",

    color: '#ff0044',
    icon: "bubblingBeam",

    maxAngleDiffInRevs: 0.01,
    cooldown: 10 * TicksPerSecond,

    intervalTicks: 2,
    lengthTicks: 20,

    jitterRatio: 0.4,

    projectile: {
        color: '#ff0044',

        density: 1,
        radius: 0.002,
        speed: 0.5,
        maxTicks: 0.25 * TicksPerSecond,
        damage: 2.5,

        render: "ray",
        trailTicks: 30,
    },
};
const meteor: Spell = {
    id: 'meteor',
    description: "Send a giant meteor towards your enemies! Nothing stops a meteor.",
    action: "projectile",

    color: '#ff0000',
    icon: "cometSpark",

    maxAngleDiffInRevs: 0.01,
    cooldown: 12 * TicksPerSecond,

    projectile: {
        color: '#ff0000',

        density: 100,
        radius: 0.03,
        speed: 0.2,
        minTicks: 1,
        maxTicks: 12 * TicksPerSecond,
        damage: 0,
        trailTicks: 15,
        categories: Categories.Projectile | Categories.Massive,
        expireOn: Categories.Obstacle,

        render: "ball",
    },
};
const kamehameha: Spell = {
    id: 'kamehameha',
    name: 'Acolyte Beam',
    description: "After a long charge time, unleash a beam so powerful it can wipe out a full-health enemy in seconds.",
    action: "spray",

    color: '#44ddff',
    icon: "glowingHands",

    maxAngleDiffInRevs: 0.0001, // Requires a lot of accuracy for long-distance targets
    chargeTicks: 0.75 * TicksPerSecond,
    cooldown: 20 * TicksPerSecond,
    retargettingRevsPerTick: 0.0003,

    knockbackCancel: true,
    movementCancel: false,
    interruptible: true,
    jitterRatio: 0.0,

    intervalTicks: 0.1 * TicksPerSecond,
    lengthTicks: 5 * TicksPerSecond,

    projectile: {
        color: '#ffffff',

        density: 0.0001,
        radius: 0.005,
        speed: 3.0,
        maxTicks: 0.5 * TicksPerSecond,
        damage: 5,
        damageScaling: false,
        trailTicks: 1.0 * TicksPerSecond,
        categories: Categories.Projectile | Categories.Massive,

        render: "ray",
    },
};
const lightning: Spell = {
    id: 'lightning',
    name: 'Repulsor',
    description: "Huge knockback, if your aim is good enough.",
    action: "projectile",

    color: '#00ddff',
    icon: "lightningHelix",

    maxAngleDiffInRevs: 0.01,
    cooldown: 10 * TicksPerSecond,
    chargeTicks: 0.1 * TicksPerSecond,

    projectile: {
        color: '#00ddff',

        density: 3,
        radius: 0.0025,
        speed: 3.0,
        maxTicks: 0.5 * TicksPerSecond,
        collideWith: Categories.All ^ Categories.Projectile,
        damage: 0,

        render: "ray",
        trailTicks: 30,
    },
};
const homing: Spell = {
    id: 'homing',
    description: "Follows the enemy. High damage, but only if the enemy doesn't know how to dodge.",
    action: "projectile",

    color: '#44ffcc',
    icon: "boltSaw",

    cooldown: 20 * TicksPerSecond,
    maxAngleDiffInRevs: 0.01,

    projectile: {
        color: '#44ffcc',

        density: 25,
        radius: 0.003,
        speed: 0.15,
        maxTicks: 5.0 * TicksPerSecond,
        damage: 10,
        expireOn: Categories.Hero | Categories.Massive | Categories.Obstacle,

        homing: {
            revolutionsPerSecond: 1,
            maxTurnProportion: 0.05,
        },

        trailTicks: 30,

        render: "projectile",
    },
};
const boomerang: Spell = {
    id: 'boomerang',
    name: 'Orbiter',
    description: "Around and around you. Keep your enemies at a safe distance.",
    action: "projectile",

    color: '#ff00ff',
    icon: "boomerangSun",

    maxAngleDiffInRevs: 0.01,
    cooldown: 20 * TicksPerSecond,

    projectile: {
        color: '#ff00ff',
        selfColor: true,

        density: 1,
        radius: 0.003,
        speed: 0.4,
        maxTicks: 5.0 * TicksPerSecond,
        damage: 10,
        expireOn: Categories.Hero | Categories.Massive,

        homing: {
            revolutionsPerSecond: 0.02,
            maxTurnProportion: 0.05,
            minDistanceToTarget: 0.075,
            targetType: HomingTargets.self,
        },

        trailTicks: 1 * TicksPerSecond,

        render: "projectile",
    },
};
const link: Spell = {
    id: 'link',
    description: "Pull your enemy to you. All your attacks gain lifesteal for the duration of the link.",
    action: "projectile",

    color: '#0000ff',
    icon: "andromedaChain",

    maxAngleDiffInRevs: 0.01,
    cooldown: 12 * TicksPerSecond,

    projectile: {
        color: '#4444ff',

        density: 1,
        radius: 0.005,
        speed: 0.25,
        strafe: true,
        maxTicks: 2.0 * TicksPerSecond,
        damage: 0,
        collideWith: Categories.All ^ Categories.Projectile,
        expireOn: Categories.Hero | Categories.Massive,
        shieldTakesOwnership: false,

        link: {
            impulsePerTick: 1.0 / TicksPerSecond,
            minDistance: Hero.Radius * 2,
            maxDistance: 0.25,
            linkTicks: 2.0 * TicksPerSecond,
            lifeSteal: 0.5,
        },

        homing: {
            revolutionsPerSecond: 1,
            afterTicks: 1.0 * TicksPerSecond,
            targetType: HomingTargets.self,
        },

        trailTicks: 1,

        render: "link",
    },
};
const bouncer: Spell = {
    id: 'bouncer',
    description: "The more times this bounces, the more damage this does. Stay close to your enemy.",
    action: "projectile",

    color: '#88ee22',
    icon: "divert",

    maxAngleDiffInRevs: 0.01,
    cooldown: 10 * TicksPerSecond,

    projectile: {
        color: '#88ee22',
        selfColor: true,

        density: 2,
        radius: 0.001,
        speed: 0.75,
        fixedSpeed: false,
        maxTicks: 3.0 * TicksPerSecond,
        damage: 4,
        collideWith: Categories.All ^ Categories.Projectile,
        expireOn: Categories.Massive,
        bounce: {
            damageFactor: 0.9,
        },

        render: "ray",
        trailTicks: 1.0 * TicksPerSecond,
    },
};
const drain: Spell = {
    id: 'drain',
    description: "Steal some life from another player. They probably didn't need it anyway.",
    action: "projectile",

    color: '#22ee88',
    icon: "energyBreath",

    maxAngleDiffInRevs: 0.01,
    cooldown: 5 * TicksPerSecond,

    projectile: {
        color: '#22ee88',

        density: 2,
        radius: 0.002,
        speed: 0.2,
        maxTicks: 2.0 * TicksPerSecond,
        damage: 5,
        lifeSteal: 1.0,
        homing: {
            revolutionsPerSecond: 0,
            redirect: true,
        },

        render: "ray",
        trailTicks: 0.5 * TicksPerSecond,
    },
};
const gravity: Spell = {
    id: 'gravity',
    name: 'Ensnare',
    description: "Hold an enemy in place while you unleash your volleys upon them.",
    action: "projectile",

    color: '#0ace00',
    icon: "atomicSlashes",

    maxAngleDiffInRevs: 0.01,
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

        gravity: {
            impulsePerTick: 0.001 / TicksPerSecond,
            ticks: 2.0 * TicksPerSecond,
            radius: 0.05,
            power: 1,
        },

        homing: {
            revolutionsPerSecond: 1,
            targetType: HomingTargets.cursor,
            minDistanceToTarget: Hero.Radius / 2,
            speedWhenClose: 0,
        },

        render: "gravity",
        trailTicks: 0.25 * TicksPerSecond,
    },
};
const supernova: Spell = {
    id: 'supernova',
    description: "A delayed explosion to knock back your enemies",
    action: "projectile",

    color: '#ffaa00',
    icon: "crownedExplosion",

    maxAngleDiffInRevs: 0.01,
    cooldown: 12 * TicksPerSecond,

    projectile: {
        color: '#ffaa00',

        density: 5,
        radius: 0.001,
        speed: 0.3,
        maxTicks: 1.25 * TicksPerSecond,
        damage: 0,
        collideWith: Categories.None,
        expireOn: Categories.None,

        detonate: {
            waitTicks: 0.5 * TicksPerSecond,
            damage: 0,
            radius: 0.05,
            minImpulse: 0.0002,
            maxImpulse: 0.0005,
        },

        render: "supernova",
        trailTicks: 30,
    },
};
const scourge: Spell = {
    id: 'scourge',
    name: 'Overload',
    description: "After a short charging time, unleash a melee-range explosion that will send your enemies flying. Be careful though, this spell is so powerful it costs you some health too.",
    untargeted: true,

    radius: Hero.Radius * 4,
    chargeTicks: 0.5 * TicksPerSecond,
    movementProportionWhileCharging: 0.3,
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
const shield: Spell = {
    id: 'shield',
    name: 'Reflect',
    description: "Reflect away projectile attacks. Ineffective against area-of-effect spells.",
    untargeted: true,

    maxTicks: 3 * TicksPerSecond,
    cooldown: 20 * TicksPerSecond,
    radius: Hero.Radius * 2,

    icon: "shieldReflect",

    color: '#3366ff',

    action: "shield",
};
const icewall: Spell = {
    id: 'icewall',
    name: 'Forcefield',
    description: "Create a wall that blocks projectiles and any teleporting/charging heroes. Heroes can still walk through the wall at a normal speed.",

    maxRange: 0.25,
    maxTicks: 3 * TicksPerSecond,
    growthTicks: 5,
    cooldown: 20 * TicksPerSecond,

    length: 0.005,
    width: 0.15,

    categories: Categories.Shield,

    icon: "woodenFence",

    color: '#0088ff',

    action: "wall",
};
const teleport: Spell = {
    id: 'teleport',
    description: "Teleport to a nearby location. Get close, or get away.",

    maxAngleDiffInRevs: 1.0,
    cooldown: 0.5 * TicksPerSecond,
    chargeTicks: 6,
    movementProportionWhileCharging: 1.0,
    interruptible: false,

    icon: "teleport",

    color: '#6666ff',

    action: "teleport",
};
const thrust: Spell = {
    id: 'thrust',
    name: 'Charge',
    description: "Accelerate quickly, knocking away anything in your path.",

    maxAngleDiffInRevs: 0.01,
    cooldown: 0.5 * TicksPerSecond,

    damage: 1,
    speed: 1.0,
    speedDecayAlpha: 0.75,
    bounceTicks: 10,

    icon: "fireDash",
    color: '#ff00cc',
    action: "thrust",
};

const Spells = {
    move,
    retarget,
    stop,
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

export const DefaultSettings: AcolyteFightSettings = {
    World,
    Hero,
    Obstacle,
    Choices,
    Spells,
    Layouts,
};

export function calculateMod(mod: Object): AcolyteFightSettings {
    return _.merge(_.cloneDeep(DefaultSettings), mod);
}