import _ from 'lodash';
import { TicksPerSecond, Categories } from './constants';
import { Actions, SpecialKeys, HomingTargets } from './world.model';

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
        { btn: "a", weight: 0.5 },
        { btn: "s", weight: 0.75 },
        null,
        { btn: "q", weight: 1 },
        { btn: "w", weight: 1 },
        { btn: "e", weight: 1 },
        { btn: "r", weight: 1 },
		null,
        { btn: "d", weight: 0.75 },
        { btn: "f", weight: 0.5 },
    ],
	Options: {
		"a": ["thrust", "teleport"],
		"s": ["shield", "icewall", "drain"],
		"q": ["fireball", "flamestrike"],
		"w": ["gravity", "link", "lightning"],
		"e": ["homing", "boomerang"],
		"r": ["kamehameha", "meteor", "supernova"],
		"d": ["firespray", "bouncer"],
		"f": ["scourge"],
	},
	Defaults: {
		"a": "thrust",
		"s": "shield",
		"q": "fireball",
		"w": "gravity",
		"e": "homing",
		"r": "kamehameha",
		"d": "firespray",
		"f": "scourge",
    },
    Special: {
        [(SpecialKeys.Move)]: Actions.Move,
        [(SpecialKeys.Retarget)]: Actions.Retarget,
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

const move: MoveSpell = {
    id: Actions.Move,
    description: "",
    color: 'white',
    maxAngleDiffInRevs: 0.25,
    interruptible: true,
    cooldown: 0,
    action: "move",
    cancelChanneling: false,
};
const go: MoveSpell = {
    id: Actions.MoveAndCancel,
    description: "",
    color: 'white',
    maxAngleDiffInRevs: 0.25,
    interruptible: true,
    cooldown: 0,
    action: "move",
    cancelChanneling: true,
};
const retarget: Spell = {
    id: Actions.Retarget,
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
        damage: 7.5,
        categories: Categories.Projectile,

        sound: "fireball",
        soundHit: "standard",
        render: "projectile",
        trailTicks: 30,
    },
};
const flamestrike: Spell = {
    id: 'flamestrike',
    name: 'Fireboom',
    description: "It's slower than fireball - harder to aim, but does more damage within a small area of effect.",
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
            damage: 12.5,
            radius: 0.025,
            minImpulse: 0.00005,
            maxImpulse: 0.00005,
        },

        sound: "flamestrike",
        render: "projectile",
        trailTicks: 30,
    },
};
const firespray: Spell = {
    id: 'firespray',
    name: 'Firesplatter',
    description: "Shoot a stream of fire in a wide arc. Get closer to focus all your damage onto one target.",
    action: "spray",
    sound: "firespray",

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
    cooldown: 9 * TicksPerSecond,

    projectile: {
        color: '#ff0000',

        density: 100,
        radius: 0.03,
        speed: 0.2,
        minTicks: 1,
        maxTicks: 5 * TicksPerSecond,
        damage: 0,
        trailTicks: 15,
        categories: Categories.Projectile | Categories.Massive,
        expireOn: Categories.Obstacle,

        sound: "meteor",
        render: "ball",
    },
};
const kamehameha: Spell = {
    id: 'kamehameha',
    name: 'Acolyte Beam',
    description: "After a long charge time, unleash a beam so powerful it can wipe out a full-health enemy in seconds.",
    action: "spray",
    sound: "kamehameha",

    color: '#44ddff',
    icon: "glowingHands",

    maxAngleDiffInRevs: 0.0001, // Requires a lot of accuracy for long-distance targets
    chargeTicks: 0.75 * TicksPerSecond,
    cooldown: 20 * TicksPerSecond,
    revsPerTickWhileCharging: 0.001,
    revsPerTickWhileChannelling: 0.00005,

    knockbackCancel: true,
    movementCancel: true,
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

        sound: "kamehameha",
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

        sound: "lightning",
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

    cooldown: 18 * TicksPerSecond,
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

        sound: "homing",
        soundHit: "standard",
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

        sound: "boomerang",
        soundHit: "standard",
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

        sound: "link",
        render: "link",
    },
};
const bouncer: Spell = {
    id: 'bouncer',
    description: "The more times this bounces, the more damage this does. Get in close and keep it bouncing.",
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
        speed: 1.0,
        fixedSpeed: false,
        maxTicks: 3.0 * TicksPerSecond,
        damage: 4,
        collideWith: Categories.All ^ Categories.Projectile,
        expireOn: Categories.Massive,
        bounce: {
            damageFactor: 0.9,
        },

        sound: "bouncer",
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
        sound: "drain",

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
    sound: "gravity",

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

        sound: "gravity",
        render: "gravity",
        trailTicks: 0.25 * TicksPerSecond,
    },
};
const supernova: Spell = {
    id: 'supernova',
    description: "A delayed explosion to knock back your enemies. Knockback is higher at the center of the blast.",
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

        sound: "supernova",
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
    cooldown: 10 * TicksPerSecond,
    interruptible: true,
    movementCancel: true,
    damage: 20,
    selfDamage: 10,
    damageScaling: false,
    minImpulse: 0.0002,
    maxImpulse: 0.0005,

    icon: "deadlyStrike",

    trailTicks: 30,
    color: '#ffcc00',

    sound: "scourge",
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
    takesOwnership: true,
    blocksTeleporters: false,

    icon: "shieldReflect",

    color: '#3366ff',

    action: "shield",
    sound: "shield",
};
const icewall: Spell = {
    id: 'icewall',
    name: 'Forcefield',
    description: "Create a wall that reflects projectiles and blocks other heroes. You can pass through your own forcefield, but other heroes cannot, even if they are using teleport.",

    maxRange: 0.25,
    maxTicks: 1.25 * TicksPerSecond,
    growthTicks: 5,
    cooldown: 20 * TicksPerSecond,
    takesOwnership: true,
    blocksTeleporters: true,

    length: 0.005,
    width: 0.15,

    categories: Categories.Shield | Categories.Obstacle,
    selfPassthrough: true,

    icon: "woodenFence",

    color: '#0088ff',

    action: "wall",
    sound: "icewall",
};
const teleport: Spell = {
    id: 'teleport',
    description: "Teleport to a nearby location. Get close, or get away.",

    maxAngleDiffInRevs: 1.0,
    cooldown: 12 * TicksPerSecond,
    chargeTicks: 6,
    movementProportionWhileCharging: 1.0,
    interruptible: false,

    icon: "teleport",

    color: '#6666ff',

    action: "teleport",
    sound: "teleport",
};
const thrust: Spell = {
    id: 'thrust',
    name: 'Charge',
    description: "Accelerate quickly, knocking away anything in your path.",

    maxAngleDiffInRevs: 0.01,
    cooldown: 12 * TicksPerSecond,

    damage: 1,
    speed: 1.0,
    speedDecayAlpha: 0.75,
    bounceTicks: 10,

    icon: "fireDash",
    color: '#ff00cc',
    action: "thrust",
    sound: "thrust",
};

const Sounds: Sounds = {
    "thrust-channelling": {
        start: [
            {
                stopTime: 0.25,
                attack: 0.03,
                decay: 0.22,

                highPass: 100,
                lowPass: 900,

                wave: "brown-noise",
            },
        ],
    },
    "teleport-channelling": {
        start: [
            {
                stopTime: 0.1,
                attack: 0.03,
                decay: 0.07,

                highPass: 780,
                lowPass: 800,

                wave: "brown-noise",
            },
        ],
    },
    "teleport-arriving": {
        start: [
            {
                stopTime: 0.25,
                attack: 0.03,
                decay: 0.22,

                highPass: 1080,
                lowPass: 1100,

                wave: "brown-noise",
            },
        ],
    },
    "shield": {
        start: [
            {
                volume: 0.25,

                stopTime: 3,
                attack: 0.25,
                decay: 2.9,

                startFreq: 90,
                stopFreq: 90,
                highPass: 40,

                wave: "sine",

                ratios: [1],
            },
        ],
    },
    "shield-hit": {
        start: [
            {
                volume: 0.5,

                stopTime: 0.5,
                attack: 0.01,
                decay: 0.49,

                startFreq: 90,
                stopFreq: 90,
                lowPass: 90,
                highPass: 40,

                modStartFreq: 180,
                modStopFreq: 180,
                modStartStrength: 90,
                modStopStrength: 90,

                wave: "sine",

                ratios: [1],
            },
        ],
    },
    "icewall": {
        start: [
            {
                volume: 0.25,

                stopTime: 1.25,
                attack: 0.1,
                decay: 1.15,

                startFreq: 100,
                stopFreq: 100,
                highPass: 40,

                wave: "sine",

                ratios: [1],
            }
        ],
    },
    "icewall-hit": {
        start: [
            {
                volume: 0.5,

                stopTime: 0.5,
                attack: 0.01,
                decay: 0.49,

                startFreq: 100,
                stopFreq: 100,
                lowPass: 100,
                highPass: 40,

                modStartFreq: 200,
                modStopFreq: 200,
                modStartStrength: 100,
                modStopStrength: 100,

                wave: "sine",

                ratios: [1],
            },
        ],
    },
    "drain": {
        start: [
            {
                stopTime: 2,
                attack: 0.25,
                decay: 1.75,

                highPass: 2500,
                lowPass: 2510,

                wave: "brown-noise",
            },
            {
                stopTime: 2,
                attack: 0.25,
                decay: 1.75,

                startFreq: 1100,
                stopFreq: 1103,
                lowPass: 300,

                tremoloFreq: 10,
                tremoloStrength: 0.2,

                wave: "square",

                ratios: [1, 1.34, 1.5],
            },
        ],
    },
    "fireball": {
        sustain: [
            {
                stopTime: 1.5,
                attack: 0.25,
                decay: 0.25,

                highPass: 432,
                lowPass: 438,

                wave: "brown-noise",

            },
        ],
    },
    "flamestrike": {
        sustain: [
            {
                stopTime: 1.5,
                attack: 0.25,
                decay: 0.25,

                highPass: 300,
                lowPass: 303,

                wave: "brown-noise",
            },
        ],
    },
    "flamestrike-detonating": {
        cutoffEarly: false,
        start: [
            {
                stopTime: 2,
                attack: 0.01,
                decay: 1.95,

                startFreq: 100,
                stopFreq: 0.01,
                lowPass: 300,

                wave: "triangle",

                ratios: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2],
            }
        ],
    },
    "lightning": {
        cutoffEarly: false,
        start: [
            {
                stopTime: 0.3,
                attack: 0.001,
                decay: 0.29,

                startFreq: 4500,
                stopFreq: 5000,

                wave: "sawtooth",
                ratios: [1, 1.33, 1.5, 1.78, 2, 2.67, 3, 3.56],
            },
        ],
    },
    "link": {
        start: [
            {
                stopTime: 2,
                attack: 1,
                decay: 1,

                startFreq: 150,
                stopFreq: 150,
                lowPass: 150,
                tremoloFreq: 10,
                tremoloStrength: 0.2,

                wave: "square",

                ratios: [1, 2, 4, 8, 16],
            },
        ],
    },
    "gravity": {
        start: [
            {
                stopTime: 8,
                attack: 0.25,
                decay: 7.75,

                startFreq: 410,
                stopFreq: 415,
                lowPass: 100,

                tremoloFreq: 12,
                tremoloStrength: 0.3,

                wave: "square",

                ratios: [1, 1.33, 1.4, 1.5],
            },
        ],
    },
    "gravity-trapped": {
        start: [
            {
                stopTime: 2,
                attack: 0.01,
                decay: 1.95,

                startFreq: 410,
                stopFreq: 415,
                lowPass: 100,

                tremoloFreq: 12,
                tremoloStrength: 0.4,

                wave: "square",

                ratios: [1, 1.33, 1.4, 1.5],
            },
        ],
    },
    "homing": {
        start: [
            {
                volume: 0.25,

                stopTime: 5,
                attack: 0.25,
                decay: 4.5,

                highPass: 1800,
                lowPass: 1803,

                wave: "brown-noise",
            },
            {
                stopTime: 5,
                attack: 0.5,
                decay: 4.5,

                startFreq: 800,
                stopFreq: 800,
                lowPass: 200,

                modStartFreq: 2400,
                modStopFreq: 2400,
                modStartStrength: 800,
                modStopStrength: 800,

                tremoloFreq: 6,
                tremoloStrength: 0.2,

                wave: "sine",

                ratios: [1, 1.5],
            },
        ],
    },
    "boomerang": {
        start: [
            {
                volume: 0.25,

                stopTime: 5,
                attack: 0.25,
                decay: 4,

                highPass: 895,
                lowPass: 925,

                wave: "brown-noise",
            },
            {
                stopTime: 5,
                attack: 0.25,
                decay: 4,

                startFreq: 205,
                stopFreq: 206,
                lowPass: 100,

                tremoloFreq: 7,
                tremoloStrength: 0.3,

                wave: "sine",

                ratios: [1, 1.5, 2, 2.75, 4, 5.5],
            },
        ],
    },
    "kamehameha-charging": {
        start: [
            {
                stopTime: 0.75,
                attack: 0.70,
                decay: 0.05,

                startFreq: 4,
                stopFreq: 19,

                wave: "triangle",

                ratios: [1, 2, 2.5, 4, 5, 8, 10, 16],
            },
        ],
    },
    "kamehameha-channelling": {
        repeatIntervalSeconds: 0.1,
        start: [
            {
                stopTime: 0.25,
                attack: 0.05,
                decay: 0.20,

                startFreq: 40,
                stopFreq: 18,

                wave: "triangle",

                ratios: [1, 2, 4],
            },
        ],
        sustain: [
            {
                stopTime: 0.25,
                attack: 0.1,
                decay: 0.15,

                startFreq: 18,
                stopFreq: 18.1,
                lowPass: 200,

                wave: "triangle",

                ratios: [1, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96],
            },
            {
                stopTime: 0.25,
                attack: 0.1,
                decay: 0.15,

                startFreq: 18,
                stopFreq: 17.9,
                lowPass: 200,

                wave: "square",

                ratios: [1, 2, 2.16, 4, 4.16, 8, 16],
            },
        ],
    },
    "kamehameha": {
    },
    "meteor": {
        start: [
            {
                stopTime: 1.0,
                attack: 0.1,
                decay: 0.9,

                startFreq: 20,
                stopFreq: 1,
                highPass: 40,
                lowPass: 300,

                wave: "square",

                ratios: [1, 2, 3, 4, 5, 6, 7, 8],
            },
        ],
        sustain: [
            {
                stopTime: 2,
                attack: 0.5,
                decay: 1.0,

                startFreq: 1,
                stopFreq: 10,
                highPass: 40,
                lowPass: 100,

                wave: "square",

                ratios: [1, 1.5, 2, 2.1, 2.16, 3.5, 6.7, 8.2],
            },
        ],
    },
    "supernova": {
        start: [
            {
                stopTime: 1,
                attack: 0.1,
                decay: 0.9,

                lowPass: 450,
                startFreq: 900,
                stopFreq: 1000,

                tremoloFreq: 7,
                tremoloStrength: 0.3,

                modStartFreq: 1000,
                modStopFreq: 1000,
                modStartStrength: 1000,
                modStopStrength: 1000,

                wave: "triangle",

                ratios: [1],
            },
        ],
    },
    "supernova-detonating": {
        cutoffEarly: false,
        start: [
            {
                stopTime: 0.75,
                attack: 0.01,
                decay: 0.74,

                startFreq: 100,
                stopFreq: 10,

                modStartFreq: 800,
                modStopFreq: 800,
                modStartStrength: 100,
                modStopStrength: 100,

                tremoloFreq: 3,
                tremoloStrength: 0.1,

                wave: "triangle",

                ratios: [1, 1.2, 1.4, 1.6, 1.8, 2.4, 2.8, 3.2, 3.6],
            },
        ],
    },
    "scourge-charging": {
        start: [
            {
                volume: 0.25,

                stopTime: 0.5,
                attack: 0.49,
                decay: 0.01,

                startFreq: 50,
                stopFreq: 200,

                modStartFreq: 25,
                modStopFreq: 100,
                modStartStrength: 25,
                modStopStrength: 100,

                wave: "triangle",

                ratios: [1, 1.25, 1.5, 1.75],
            },
        ],
    },
    "scourge-detonating": {
        cutoffEarly: false,
        start: [
            {
                volume: 0.25,

                stopTime: 1,
                attack: 0.01,
                decay: 0.99,

                startFreq: 100,
                stopFreq: 10,

                wave: "triangle",

                ratios: [1, 1.2, 1.4, 1.6, 1.8],
            },
            {
                volume: 0.25,

                stopTime: 1,
                attack: 0.01,
                decay: 0.99,

                startFreq: 100,
                stopFreq: 30,

                modStartFreq: 313,
                modStopFreq: 100,
                modStartStrength: 600,
                modStopStrength: 100,

                tremoloFreq: 3,
                tremoloStrength: 0.1,

                wave: "triangle",

                ratios: [1, 1.33, 1.5],
            },
        ],
    },
    "bouncer": {
        start: [
            {
                stopTime: 0.5,
                attack: 0.1,
                decay: 0.4,

                startFreq: 8900,
                stopFreq: 8100,
                lowPass: 9000,

                wave: "square",

                ratios: [1, 1.33, 1.5],
            },
        ],
    },
    "bouncer-hit": {
        cutoffEarly: false,
        start: [
            {
                stopTime: 0.5,
                attack: 0.001,
                decay: 0.49,

                startFreq: 8100,
                stopFreq: 8500,
                lowPass: 9000,

                wave: "square",

                ratios: [1, 1.33, 1.5],
            },
        ],
    },
    "firespray-channelling": {
        cutoffEarly: false,
        start: [
            {
                volume: 0.25,

                stopTime: 0.5,
                attack: 0.1,
                decay: 0.25,

                startFreq: 4800,
                stopFreq: 7200,

                modStartFreq: 30,
                modStopFreq: 30,
                modStartStrength: 3600,
                modStopStrength: 10800,

                tremoloFreq: 30,
                tremoloStrength: 0.1,

                wave: "triangle",

                ratios: [1, 1.33, 1.5],
            }
        ],
    },
    "standard-hit": {
        cutoffEarly: false,
        start: [
            {
                stopTime: 0.75,
                attack: 0.01,
                decay: 0.70,

                startFreq: 150,
                stopFreq: 0.01,
                lowPass: 500,

                wave: "triangle",

                ratios: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2],
            },
        ],
    },
    "death": {
        cutoffEarly: false,
        start: [
            {
                stopTime: 0.3,
                attack: 0.01,
                decay: 0.29,

                startFreq: 225,
                stopFreq: 225,
                lowPass: 225,

                tremoloFreq: 6,
                tremoloStrength: 1,

                wave: "triangle",

                ratios: [1, 1.5],
            },
        ],
    },
};

const Spells = {
    move,
    go,
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
    Sounds,
};

export function calculateMod(mod: Object): AcolyteFightSettings {
    return _.merge(_.cloneDeep(DefaultSettings), mod);
}