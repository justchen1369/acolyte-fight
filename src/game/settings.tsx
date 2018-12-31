import _ from 'lodash';
import { TicksPerSecond, Categories, Pixel } from './constants';
import { Icons } from './icons';
import { Layouts } from './layouts';
import { Sounds } from './sounds';
import { Actions, SpecialKeys, HomingTargets } from './world.model';

const Hero: HeroSettings = {
    MoveSpeedPerSecond: 0.1,
    Radius: 0.015,
    Density: 0.5,

    AngularDamping: 1,
    Damping: 3,

    DamageMitigationTicks: 90,

    AdditionalDamageMultiplier: 2.0,
    AdditionalDamagePower: 1.0,

    MaxHealth: 100,
    SeparationImpulsePerTick: 0.01,

    RevolutionsPerTick: 1.0,
    MaxDashRange: 0.25,
}

const World: WorldSettings = {
    InitialRadius: 0.4,
    HeroLayoutRadius: 0.25,

    LavaDamagePerSecond: 15,
    SecondsToShrink: 90,
    ShrinkPower: 1.25,
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
		"q": ["fireball", "flamestrike", "triplet"],
		"w": ["gravity", "link", "lightning"],
		"e": ["homing", "boomerang"],
		"r": ["kamehameha", "meteor", "supernova"],
		"d": ["firespray", "bouncer", "whip"],
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

const renderLink: RenderLink = {
    type: "link",
    width: 5 * Pixel,
};

const renderGravity: RenderSwirl = {
    type: "swirl",
    loopTicks: 20,
    numParticles: 3,
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
        renderers: [
            { type: "projectile" },
            { type: "ray" },
        ],
        trailTicks: 30,
    },
};
const flamestrike: Spell = {
    id: 'flamestrike',
    name: 'Fireboom',
    description: "It's slower than fireball - harder to aim, but does more damage at longer ranges. At short range, does the same amount of damage as fireball.",
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
        expireAfterCursorTicks: 0,

        detonate: {
            damage: 12.5,
            radius: 0.025,
            minImpulse: 0.00005,
            maxImpulse: 0.00005,
            renderTicks: 10,
        },

        partialDamage: {
            initialMultiplier: 0.5,
            ticks: 0.5 * TicksPerSecond,
        },

        sound: "flamestrike",
        renderers: [
            { type: "projectile" },
            { type: "ray" },
        ],
        trailTicks: 30,
    },
};
const triplet: Spell = {
    id: 'triplet',
    name: 'Trifire',
    description: "Shoots 3 bolts of fire. Easy to hit, but also easy to do 1/3 damage.",
    action: "spray",
    sound: "triplet",

    color: '#ff0044',
    icon: "tripleScratches",

    maxAngleDiffInRevs: 0,
    cooldown: 1.5 * TicksPerSecond,

    intervalTicks: 1,
    lengthTicks: 3,

    jitterRatio: 0.1,

    projectile: {
        color: '#ff0044',

        density: 5,
        radius: 0.002,
        speed: 0.3,
        maxTicks: 100,
        damage: 2.5,
        categories: Categories.Projectile,

        sound: "triplet",
        soundHit: "standard",
        renderers: [
            { type: "projectile" },
            { type: "ray" },
        ],
        trailTicks: 10,
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

        renderers: [
            { type: "ray", intermediatePoints: true },
        ],
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
        renderers: [
            { type: "projectile" },
        ],
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
    revsPerTickWhileCharging: 0.005,
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
        renderers: [
            { type: "ray", intermediatePoints: true },
        ],
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
        renderers: [
            { type: "ray", intermediatePoints: true },
        ],
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
        renderers: [
            { type: "projectile" },
            { type: "ray" },
        ],
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
        renderers: [
            { type: "projectile" },
            { type: "ray" },
        ],
    },
};

const whip: Spell = {
    id: 'whip',
    name: 'Electrolash',
    description: "Shock your enemies with the epicenter for maximum damage and knockback. The whip has a fixed length, so stay close, but not too close.",
    action: "projectile",

    color: '#44ff44',
    icon: "electricWhip",

    maxAngleDiffInRevs: 0.01,
    chargeTicks: 8,
    cooldown: 5 * TicksPerSecond,

    projectile: {
        color: '#44ff44',

        density: 5,
        radius: 0.001,
        speed: 0.7,
        maxTicks: 6,
        damage: 0,
        categories: Categories.Projectile,
        collideWith: Categories.Obstacle | Categories.Shield | Categories.Massive,
        expireOn: Categories.None,
        strafe: true,
        shieldTakesOwnership: false,

        detonate: {
            damage: 20,
            outerDamage: 5,
            radius: 0.025,
            minImpulse: 0.0001,
            maxImpulse: 0.0002,
            renderTicks: 10,
        },

        sound: "whip",
        renderers: [
            { type: "link", width: Pixel * 5 },
        ],
        trailTicks: 1,
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

        redirect: {
            afterTicks: 1.0 * TicksPerSecond,
            targetType: HomingTargets.self,
        },

        trailTicks: 1,

        sound: "link",
        renderers: [
            renderLink,
        ],
    },
};
const bouncer: Spell = {
    id: 'bouncer',
    description: "The more times this bounces, the more damage this does. Get in close and keep it bouncing.",
    action: "projectile",

    color: '#88ee22',
    icon: "divert",

    maxAngleDiffInRevs: 0.01,
    cooldown: 8 * TicksPerSecond,

    projectile: {
        color: '#88ee22',
        selfColor: true,

        density: 2,
        radius: 0.001,
        speed: 1.5,
        fixedSpeed: false,
        maxTicks: 3.0 * TicksPerSecond,
        damage: 4,
        collideWith: Categories.All ^ Categories.Projectile,
        expireOn: Categories.Massive,
        bounce: {
            damageFactor: 0.95,
        },

        sound: "bouncer",
        renderers: [
            { type: "ray", intermediatePoints: true },
        ],
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
        redirect: {
            targetType: "enemy",
            atCursor: true,
        },

        renderers: [
            { type: "ray", intermediatePoints: true },
        ],
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

        redirect: {
            targetType: HomingTargets.cursor,
            atCursor: true,
            newSpeed: 0,
        },

        sound: "gravity",
        renderers: [
            renderGravity,
        ],
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
        expireAfterCursorTicks: 0.5 * TicksPerSecond,

        redirect: {
            targetType: "cursor",
            atCursor: true,
            newSpeed: 0,
        },
        detonate: {
            damage: 0,
            radius: 0.05,
            minImpulse: 0.0002,
            maxImpulse: 0.0005,
            renderTicks: 30,
        },

        sound: "supernova",
        renderers: [
            { type: "ray" },
            { type: "reticule", ticks: 0.5 * TicksPerSecond, radius: 0.05 },
        ],
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
    cooldown: 5 * TicksPerSecond,
    interruptible: true,
    movementCancel: true,
    damage: 20,
    selfDamage: 10,
    minSelfHealth: 1,
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

    maxTicks: 2.5 * TicksPerSecond,
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

const Spells = {
    move,
    go,
    retarget,
    stop,
    fireball,
    flamestrike,
    firespray,
    triplet,
    meteor,
    gravity,
    link,
    kamehameha,
    lightning,
    homing,
    boomerang,
    whip,
    bouncer,
    drain,
    icewall,
    scourge,
    shield,
    supernova,
    teleport,
    thrust,
};

const Render: RenderSettings = {
    link: renderLink,
    gravity: renderGravity,
};

export const Mod: ModSettings = {
    name: null,
    author: null,
    description: null,
};

export const DefaultSettings: AcolyteFightSettings = {
    Mod,
    World,
    Hero,
    Obstacle,
    Choices,
    Spells,
    Layouts,
    Sounds,
    Icons,
    Render,
};