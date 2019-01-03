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
		"a": ["thrust", "teleport", "swap"],
		"s": ["shield", "icewall", "drain", "saber"],
		"q": ["fireball", "flamestrike", "triplet"],
		"w": ["gravity", "link", "lightning"],
		"e": ["homing", "boomerang", "retractor"],
		"r": ["kamehameha", "meteor", "supernova"],
		"d": ["firespray", "bouncer", "whip"],
		"f": ["scourge", "mines"],
	},
    Special: {
        [(SpecialKeys.Move)]: Actions.Move,
        [(SpecialKeys.Retarget)]: Actions.Retarget,
    },
}

const renderLink: RenderLink = {
    type: "link",
    color: '#4444ff',
    width: 5 * Pixel,
};

const renderGravity: RenderSwirl = {
    type: "swirl",

    color: '#0ace00',
    radius: 0.02,
    ticks: 0.25 * TicksPerSecond,

    loopTicks: 20,

    numParticles: 3,
    particleRadius: 0.02 / 3,
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
        density: 10,
        radius: 0.003,
        speed: 0.5,
        maxTicks: 1 * TicksPerSecond,
        damage: 7.5,
        categories: Categories.Projectile,

        sound: "fireball",
        soundHit: "standard",
        renderers: [
            { type: "projectile", color: '#ff8800', ticks: 30 },
            { type: "ray", color: '#ff8800', ticks: 30  },
        ],
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
            { type: "projectile", color: '#ff4400', ticks: 30 },
            { type: "ray", color: '#ff4400', ticks: 30 },
        ],
    },
};
const triplet: Spell = {
    id: 'triplet',
    name: 'Trifire',
    description: "Shoots 3 bolts of fire. Easy to hit, but also easy to do 1/3 damage.",
    action: "spray",
    sound: "triplet",

    color: '#ff0088',
    icon: "tripleScratches",

    maxAngleDiffInRevs: 0,
    cooldown: 1.5 * TicksPerSecond,

    intervalTicks: 1,
    lengthTicks: 3,

    jitterRatio: 0.1,

    projectile: {
        density: 5,
        radius: 0.002,
        speed: 0.3,
        maxTicks: 100,
        damage: 3.75,
        categories: Categories.Projectile,

        sound: "triplet",
        soundHit: "standard",
        renderers: [
            { type: "projectile", color: '#ff0088', ticks: 10 },
            { type: "ray", color: '#ff0088', ticks: 10 },
        ],
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
        density: 1,
        radius: 0.002,
        speed: 0.5,
        maxTicks: 0.25 * TicksPerSecond,
        damage: 2.5,

        renderers: [
            { type: "ray", intermediatePoints: true, color: '#ff0044', ticks: 30 },
        ],
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
        density: 100,
        radius: 0.03,
        speed: 0.2,
        minTicks: 1,
        maxTicks: 5 * TicksPerSecond,
        damage: 0,
        categories: Categories.Projectile | Categories.Massive,
        expireOn: Categories.Obstacle,

        sound: "meteor",
        renderers: [
            { type: "projectile", color: '#ff0000', ticks: 15 },
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
    cooldown: 10 * TicksPerSecond,
    revsPerTickWhileCharging: 0.0025,
    revsPerTickWhileChannelling: 0.00005,

    knockbackCancel: {
        cooldownTicks: 1 * TicksPerSecond,
    },
    movementCancel: true,
    interruptible: true,
    jitterRatio: 0.0,

    intervalTicks: 0.1 * TicksPerSecond,
    lengthTicks: 3 * TicksPerSecond,

    projectile: {
        density: 0.0001,
        radius: 0.005,
        speed: 3.0,
        maxTicks: 0.5 * TicksPerSecond,
        damage: 5,
        damageScaling: false,
        categories: Categories.Projectile | Categories.Massive,

        sound: "kamehameha",
        renderers: [
            { type: "ray", intermediatePoints: true, color: '#ffffff', ticks: 60 },
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
        density: 3,
        radius: 0.0025,
        speed: 3.0,
        maxTicks: 0.5 * TicksPerSecond,
        collideWith: Categories.All ^ Categories.Projectile,
        damage: 0,

        sound: "lightning",
        renderers: [
            { type: "ray", intermediatePoints: true, color: '#00ddff', ticks: 30 },
        ],
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
        density: 25,
        radius: 0.003,
        speed: 0.15,
        maxTicks: 5.0 * TicksPerSecond,
        damage: 10,
        expireOn: Categories.Hero | Categories.Massive | Categories.Obstacle,

        behaviours: [
            {
                type: "homing",
                revolutionsPerSecond: 1,
                maxTurnProportion: 0.05,
            },
        ],

        sound: "homing",
        soundHit: "standard",
        renderers: [
            { type: "projectile", color: '#44ffcc', ticks: 30 },
            { type: "ray", color: '#44ffcc', ticks: 30 },
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
        density: 1,
        radius: 0.003,
        speed: 0.4,
        maxTicks: 5.0 * TicksPerSecond,
        damage: 10,
        expireOn: Categories.Hero | Categories.Massive,

        behaviours: [
            {
                type: "homing",
                revolutionsPerSecond: 0.02,
                maxTurnProportion: 0.05,
                minDistanceToTarget: 0.075,
                targetType: HomingTargets.self,
            },
        ],

        sound: "boomerang",
        soundHit: "standard",
        renderers: [
            { type: "projectile", color: '#ff00ff', selfColor: true, ticks: 60 },
            { type: "ray", color: '#ff00ff', selfColor: true, ticks: 60  },
        ],
    },
};
const retractor: Spell = {
    id: 'retractor',
    name: 'Refract',
    description: "Refract can turn corners - cast a second time to redirect the spell. Damage increases with distance travelled, so take an indirect path to do maximum damage.",
    action: "retractor",

    color: '#00ff7f',
    icon: "arcingBolt",

    maxAngleDiffInRevs: 0.01,
    cooldown: 16 * TicksPerSecond,

    retractCooldownTicks: 0,
    retractBehaviours: [
        {
            type: "homing",
            targetType: "cursor",
            newSpeed: 0.3,
            redirect: true,
        },
    ],

    projectile: {
        density: 10,
        radius: 0.005,
        speed: 0.25,
        maxTicks: 4.0 * TicksPerSecond,
        damage: 20,
        collideWith: Categories.All,
        expireOn: Categories.Hero | Categories.Massive | Categories.Obstacle,

        partialDamage: {
            initialMultiplier: 0.1,
            ticks: 2 * TicksPerSecond,
        },

        sound: "retractor",
        soundHit: "standard",
        renderers: [
            {
                type: "swirl",
                color: '#00ff7f',
                ticks: 30,
                radius: 0.009,
                particleRadius: 0.001,
                numParticles: 2,
                loopTicks: 15,
            },
            { type: "projectile", color: '#00ff7f', ticks: 15 },
            { type: "ray", color: '#00ff7f', ticks: 15 },
        ],
    },
};

const whip: Spell = {
    id: 'whip',
    name: 'Electrolash',
    description: "Shock your enemies with the epicenter for maximum damage and knockback. The whip has a fixed length, so stay close, but not too close.",
    action: "projectile",

    color: '#39fffa',
    icon: "electricWhip",

    maxAngleDiffInRevs: 0.01,
    chargeTicks: 15,
    cooldown: 10 * TicksPerSecond,

    projectile: {
        density: 2,
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
            maxImpulse: 0.0003,
            renderTicks: 10,
        },

        sound: "whip",
        renderers: [
            {
                type: "swirl",
                color: '#fffcb1',
                ticks: 30,
                radius: 0.009,
                particleRadius: 0.001,
                numParticles: 2,
                loopTicks: 15,
            },
            { type: "link", color: '#fffcb1', width: Pixel * 5 },
        ],
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

        behaviours: [
            {
                type: "homing",
                trigger: { afterTicks: 1.0 * TicksPerSecond },
                targetType: HomingTargets.self,
                redirect: true,
            },
        ],

        sound: "link",
        renderers: [
            { type: "projectile", color: "#4444ff", ticks: 1 },
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
    cooldown: 10 * TicksPerSecond,

    projectile: {
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
            { type: "ray", intermediatePoints: true, color: '#88ee22', selfColor: true, ticks: 60 },
        ],
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
        sound: "drain",

        density: 2,
        radius: 0.002,
        speed: 0.2,
        maxTicks: 2.0 * TicksPerSecond,
        damage: 5,
        lifeSteal: 1.0,

        behaviours: [
            {
                type: "homing",
                targetType: "enemy",
                trigger: { atCursor: true },
                redirect: true,
            },
        ],

        renderers: [
            { type: "ray", intermediatePoints: true, color: '#22ee88', ticks: 30 },
        ],
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

        behaviours: [
            {
                type: "homing",
                targetType: "cursor",
                trigger: { atCursor: true },
                newSpeed: 0,
                redirect: true,
            },
        ],

        sound: "gravity",
        renderers: [
            renderGravity,
        ],
    },
};
const supernova: Spell = {
    id: 'supernova',
    description: "A delayed explosion to knock back your enemies. Knockback is higher at the center of the blast.",
    action: "projectile",

    color: '#ff9a00',
    icon: "crownedExplosion",

    maxAngleDiffInRevs: 0.01,
    cooldown: 12 * TicksPerSecond,

    projectile: {
        density: 5,
        radius: 0.001,
        speed: 0.3,
        maxTicks: 1.25 * TicksPerSecond,
        damage: 0,
        collideWith: Categories.None,
        expireOn: Categories.None,
        expireAfterCursorTicks: 0.5 * TicksPerSecond,

        behaviours: [ // Either one of the following will stop the projectile
            {
                type: "homing",
                targetType: "cursor",
                trigger: { atCursor: true },
                newSpeed: 0,
                redirect: true,
            },
            {
                type: "homing",
                targetType: "cursor",
                trigger: { afterTicks: 0.75 * TicksPerSecond },
                newSpeed: 0,
                redirect: true,
            },
        ],
        detonate: {
            damage: 0,
            radius: 0.05,
            minImpulse: 0.0002,
            maxImpulse: 0.0005,
            renderTicks: 30,
        },

        sound: "supernova",
        renderers: [
            { type: "ray", color: '#ff9a00', ticks: 30 },
            { type: "reticule", color: '#ff9a00', ticks: 0.5 * TicksPerSecond, radius: 0.05 },
        ],
    },
};

const mines: Spell = {
    id: 'mines',
    name: 'Energy Mines',
    description: "Mark out your territory with some energy mines.",
    action: "spray",
    sound: "mines",

    color: '#ff009c',
    icon: "mineExplosion",

    maxAngleDiffInRevs: 0.01,
    cooldown: 10 * TicksPerSecond,

    intervalTicks: 1,
    lengthTicks: 7,

    jitterRatio: 1.0,

    projectile: {
        density: 1,
        radius: 0.004,
        speed: 0.5,
        maxTicks: 7.5 * TicksPerSecond,
        damage: 0,

        collideWith: Categories.Hero | Categories.Obstacle | Categories.Massive, // no shield, intentionally
        expireOn: Categories.All,
        detonatable: true,

        detonate: {
            damage: 2.5,
            radius: 0.015,
            minImpulse: 0.0001,
            maxImpulse: 0.0001,
            renderTicks: 15,
        },
        shieldTakesOwnership: false,

        damageScaling: false,

        behaviours: [
            {
                type: "homing",
                targetType: "cursor",
                trigger: { afterTicks: 6 },
                newSpeed: 0,
                redirect: true,
            },
        ],

        sound: "mines",
        renderers: [
            { type: "projectile", color: '#ff009c', ticks: 1, selfColor: true },
            { type: "ray", intermediatePoints: true, color: '#ff009c', ticks: 3, selfColor: true },
        ],
    },
};

const saber: Spell = {
    id: 'saber',
    name: 'Lightsaber',
    description: "Swing your lightsaber to deflect projectiles and knockback enemies!",

    takesOwnership: true,
    blocksTeleporters: false,
    speedMultiplier: 1.25,
    maxSpeed: 1.0,

    width: Pixel,
    length: 0.075,

    movementProportionWhileChannelling: 0.5,
    interruptible: true,

    cooldown: 20 * TicksPerSecond,

    icon: "waveStrike",

    maxTicks: 2.5 * TicksPerSecond,

    categories: Categories.Shield,
    collidesWith: Categories.Hero | Categories.Projectile,

    trailTicks: 5,
    color: '#00ccff',

    sound: "saber",
    action: "saber",
};

const scourge: Spell = {
    id: 'scourge',
    name: 'Overload',
    description: "After a short charging time, unleash a melee-range explosion that will send your enemies flying. Be careful though, this spell is so powerful it costs you some health too.",
    untargeted: true,

    detonate: {
        damage: 20,
        radius: Hero.Radius * 4,
        minImpulse: 0.0002,
        maxImpulse: 0.0005,
        renderTicks: 30,
    },
    chargeTicks: 0.5 * TicksPerSecond,
    cooldown: 5 * TicksPerSecond,
    interruptible: true,
    movementCancel: true,
    selfDamage: 10,
    minSelfHealth: 1,
    damageScaling: false,

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

    range: 0.25,
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

    range: 0.25,
    maxAngleDiffInRevs: 0.01,
    cooldown: 12 * TicksPerSecond,

    damage: 1,
    speed: 1.0,
    bounceTicks: 10,

    icon: "fireDash",
    color: '#ff00cc',
    action: "thrust",
    sound: "thrust",
};
const swap: Spell = {
    id: 'swap',
    name: 'Swap',
    description: "Swap positions with an enemy, obstacle or meteor. Teleports if you miss.",
    action: "projectile",

    color: '#23e3ff',
    icon: "bodySwapping",

    maxAngleDiffInRevs: 0.01,
    cooldown: 10 * TicksPerSecond,

    projectile: {
        density: 0.001,
        radius: 0.005,
        speed: 0.6,
        maxTicks: 0.75 * TicksPerSecond,
        damage: 0,
        categories: Categories.Projectile,
        collideWith: Categories.All ^ Categories.Projectile,
        expireOn: Categories.All ^ Categories.Shield,
        expireAfterCursorTicks: 0,
        shieldTakesOwnership: false,

        swapWith: Categories.Hero | Categories.Obstacle | Categories.Massive,

        sound: "swap",
        renderers: [
            {
                type: "swirl",
                color: '#75e7ff',
                ticks: 30,
                radius: 0.01,
                particleRadius: 0.001,
                numParticles: 2,
                loopTicks: 15,
            },
            { type: "link", color: '#75e7ff', width: Pixel * 5 },
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
    triplet,
    meteor,
    gravity,
    link,
    kamehameha,
    lightning,
    homing,
    boomerang,
    retractor,
    whip,
    bouncer,
    drain,
    icewall,
    saber,
    scourge,
    shield,
    supernova,
    mines,
    teleport,
    thrust,
    swap,
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