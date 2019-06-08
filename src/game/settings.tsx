import _ from 'lodash';
import { TicksPerSecond, Categories, Pixel, Alliances } from './constants';
import { Icons } from './icons';
import { Layouts } from './layouts';
import { ObstacleTemplates } from './obstacleTemplates';
import { Sounds } from './sounds';
import { Actions, SpecialKeys, HomingTargets } from './world.model';

const Hero: HeroSettings = {
    MoveSpeedPerSecond: 0.1,
    MaxSpeed: 1.0,
    Radius: 0.0125,
    Density: 0.72,

    AngularDamping: 1,
    Damping: 3,

    DamageMitigationTicks: 90,
    ThrottleTicks: 15,

    AdditionalDamageMultiplier: 0,
    AdditionalDamagePower: 1.0,

    DamageBonusProportion: 0.01,
    MaxDamageBonusProportion: 1.5,
    KnockbackRatio: 1,

    MaxHealth: 100,
    SeparationImpulsePerTick: 0.01,

    RevolutionsPerTick: 1.0,

    InitialStaticSeconds: 0.5,
}

const World: WorldSettings = {
    InitialRadius: 0.4,
    HeroLayoutRadius: 0.25,

    LavaDamagePerSecond: 13.75,
    LavaLifestealProportion: 0.2,
    LavaDamageInterval: 20,

    SecondsToShrink: 90,
    ShrinkPowerMinPlayers: 1.5,
    ShrinkPowerMaxPlayers: 1,

    ProjectileSpeedDecayFactorPerTick: 0.05,
    ProjectileSpeedMaxError: 0.001,

    SwatchHealth: 100,
}

const Obstacle: ObstacleSettings = {
	AngularDamping: 5,
	LinearDamping: 2,
    Density: 100.0,
    ReturnProportion: 0.04,
    ReturnMinSpeed: 0.02,
    ReturnTurnRate: 0.002,
}

const Choices: ChoiceSettings = {
	Keys: [
        { btn: "a", barSize: 0.75, wheelSize: 0.5 },
        null,
        { btn: "q", barSize: 1, wheelSize: 1 },
        { btn: "w", barSize: 1, wheelSize: 0.75 },
        { btn: "e", barSize: 1, wheelSize: 0.75 },
        { btn: "r", barSize: 1, wheelSize: 0.75 },
		null,
        { btn: "f", barSize: 0.75, wheelSize: 0.5 },
    ],
	Options: {
		"a": [
            ["thrust"],
            ["teleport", "swap"],
            ["voidRush", "vanish"],
        ],
		"q": [
            ["fireball", "flamestrike"],
            ["triplet", "difire"],
            ["retractor", "backlash"],
            ["whip"],
        ],
		"w": [
            ["gravity", "whirlwind"],
            ["link", "grapple"],
            ["lightning"],
            ["homing", "boomerang"],
        ],
		"e": [
            ["saber", "dualSaber"],
            ["shield", "icewall"],
            ["drain", "horcrux"],
            ["meteor", "meteorite"],
        ],
		"r": [
            ["kamehameha"],
            ["bouncer", "repeater"],
            ["supernova", "rocket"],
        ],
		"f": [
            ["scourge"],
            ["firespray"],
            ["mines"],
            ["halo"],
        ],
	},
    Special: {
        [(SpecialKeys.Move)]: Actions.Move,
        [(SpecialKeys.Retarget)]: Actions.Retarget,
        "s": Actions.Stop,
    },
}

const move: MoveSpell = {
    id: Actions.Move,
    description: "",
    color: 'white',
    maxAngleDiffInRevs: 0.25,
    interruptibleAfterTicks: 0,
    cooldown: 0,
    action: "move",
    cancelChanneling: false,
};
const go: MoveSpell = {
    id: Actions.MoveAndCancel,
    description: "",
    color: 'white',
    maxAngleDiffInRevs: 0.25,
    interruptibleAfterTicks: 0,
    cooldown: 0,
    action: "move",
    cancelChanneling: true,
};
const retarget: Spell = {
    id: Actions.Retarget,
    description: "",
    color: 'white',
    maxAngleDiffInRevs: 1.0,
    interruptibleAfterTicks: 0,
    cooldown: 0,
    action: "retarget",
};
const stop: Spell = {
    id: 'stop',
    description: "",
    color: 'white',
    maxAngleDiffInRevs: 1.0,
    interruptibleAfterTicks: 0,
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
    throttle: true,

    projectile: {
        density: 12.5,
        radius: 0.003,
        speed: 0.6,
        maxTicks: 1.5 * TicksPerSecond,
        damage: 10,
        lifeSteal: 0.2,
        categories: Categories.Projectile,

        sound: "fireball",
        soundHit: "standard",
        color: '#ff8800',
        renderers: [
            { type: "projectile", ticks: 1 },
            { type: "ray", ticks: 30 },
            { type: "strike", ticks: 30, glow: true, numParticles: 5 },
        ],
    },
};
const flamestrike: Spell = {
    id: 'flamestrike',
    name: 'Fireboom',
    description: "It's slower than fireball - harder to aim, but does more damage. Takes 0.5 seconds to grow to full damage, so keep a little bit of distance for maximum effect.",
    action: "projectile",

    color: '#ff4400',
    icon: "burningDot",

    maxAngleDiffInRevs: 0.01,
    cooldown: 1.5 * TicksPerSecond,
    throttle: true,

    projectile: {
        density: 5,
        radius: 0.005,
        speed: 0.18,
        maxTicks: 2 * TicksPerSecond,
        damage: 0,
        lifeSteal: 0.2,
        categories: Categories.Projectile,
        expireAfterCursorTicks: 0,

        detonate: {
            damage: 20,
            lifeSteal: 0.2,
            radius: 0.03,
            minImpulse: 0.00005,
            maxImpulse: 0.00005,

            renderTicks: 10,
        },

        partialDetonateRadius: {
            initialMultiplier: 0.3,
            ticks: 1 * TicksPerSecond,
        },

        partialDamage: {
            initialMultiplier: 0.5,
            ticks: 0.5 * TicksPerSecond,
        },

        sound: "flamestrike",
        color: '#ff4400', 
        renderers: [
            { type: "projectile", ticks: 30, smoke: 0.4, fade: "#333" },
            { type: "ray", ticks: 30 },
            { type: "strike", ticks: 30, glow: true, numParticles: 3 },
        ],
    },
};
const triplet: Spell = {
    id: 'triplet',
    name: 'Trifire',
    description: "Each bolt of Trifire will add another stack of continuous burning damage. Keep hitting your enemy with Trifire to burn them faster and faster.",
    action: "spray",
    sound: "triplet",

    color: '#ff0088',
    icon: "tripleScratches",

    maxAngleDiffInRevs: 0,
    cooldown: 1.5 * TicksPerSecond,
    throttle: true,

    intervalTicks: 1,
    lengthTicks: 3,

    jitterRatio: 0.1,

    projectile: {
        density: 1,
        radius: 0.002,
        speed: 0.3,
        maxTicks: 1.5 * TicksPerSecond,
        damage: 0,
        lifeSteal: 0.2,
        categories: Categories.Projectile,

        sound: "triplet",
        soundHit: "standard",
        color: '#ff0088',
        renderers: [
            { type: "projectile", ticks: 1 },
            { type: "ray", ticks: 10 },
            { type: "strike", ticks: 30, glow: true, numParticles: 2 },
        ],

        buffs: [
            {
                type: "burn",
                collideWith: Categories.Hero | Categories.Obstacle,
                against: Alliances.NotFriendly,
                stack: "fire",
                hitInterval: TicksPerSecond / 3,
                packet: { damage: 12.5 / 3 / 4 / 3, lifeSteal: 0.2, noHit: true, noKnockback: true }, // 3 projectiles, 4 seconds, 3 times per second
                maxTicks: 4 * TicksPerSecond,
                render: {
                    color: "#ff0088",
                    alpha: 0.15 / 3, // 3 projectiles
                    ticks: 15,
                    emissionRadiusFactor: 1,
                    particleRadius: 0.5 * Hero.Radius,
                },
            },
        ],
    },
};
const difire: Spell = {
    id: 'difire',
    name: 'Difire',
    description: "Each bolt of Difire will add another stack of continuous burning damage. Keep hitting your enemy with Difire to burn them faster and faster.",
    action: "spray",

    color: '#ff0088',
    icon: "crossedSlashes",
    sound: "triplet",

    maxAngleDiffInRevs: 0.01,
    cooldown: 1.5 * TicksPerSecond,
    throttle: true,
    interruptibleAfterTicks: 0,

    movementProportionWhileChannelling: 1.0,
    revsPerTickWhileChannelling: 1.0,

    intervalTicks: 1,
    lengthTicks: 2,

    jitterRatio: 1.0,

    projectile: {
        density: 1,
        radius: 0.002,
        speed: 0.9,
        maxTicks: 1.5 * TicksPerSecond,
        damage: 0,
        lifeSteal: 0.2,
        selfPassthrough: true,
        categories: Categories.Projectile,

        sound: "triplet",
        soundHit: "standard",

        behaviours: [
            {
                type: "homing",
                targetType: "cursor",
                trigger: { afterTicks: 1 },
                redirect: true,
                newSpeed: 0.6,
            },
        ],

        color: '#ff0088',
        renderers: [
            { type: "projectile", ticks: 1 },
            { type: "ray", ticks: 8 },
            { type: "strike", ticks: 8, glow: true, numParticles: 2 },
        ],

        buffs: [
            {
                type: "burn",
                collideWith: Categories.Hero | Categories.Obstacle,
                against: Alliances.NotFriendly,
                stack: "fire",
                hitInterval: TicksPerSecond / 3,
                packet: { damage: 12.5 / 2 / 4 / 3, lifeSteal: 0.2, noHit: true, noKnockback: true }, // 2 projectiles, 4 seconds, 3 times per second
                maxTicks: 4 * TicksPerSecond,
                render: {
                    color: "#ff0088",
                    alpha: 0.15 / 2, // 2 projectiles
                    ticks: 15,
                    emissionRadiusFactor: 1,
                    particleRadius: 0.5 * Hero.Radius,
                },
            },
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
    cooldown: 5 * TicksPerSecond,
    throttle: true,

    intervalTicks: 2,
    lengthTicks: 20,

    jitterRatio: 0.4,

    projectile: {
        density: 1,
        knockbackScaling: false,
        radius: 0.002,
        speed: 0.5,
        maxTicks: 0.25 * TicksPerSecond,
        damage: 2,
        lifeSteal: 0.2,

        color: '#ff0044',
        renderers: [
            { type: "ray", intermediatePoints: true, ticks: 30 },
            { type: "strike", ticks: 30, glow: true, numParticles: 1 },
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
    cooldown: 7.5 * TicksPerSecond,
    throttle: true,

    projectile: {
        density: 100,
        radius: 0.03,
        speed: 0.2,
        restitution: 0,
        minTicks: 1,
        maxTicks: 3 * TicksPerSecond,
        hitInterval: 120,
        damage: 0,
        shieldTakesOwnership: false,
        categories: Categories.Projectile | Categories.Massive,
        collideWith: Categories.All ^ Categories.Shield, // Shields have no effect on Meteor
        expireOn: Categories.None,

        sound: "meteor",
        color: '#ff0000',
        renderers: [
            { type: "projectile", ticks: 15, smoke: 0.5, fade: "#333" },
            { type: "strike", ticks: 15, glow: true, growth: 0.1 },
        ],
    },
};
const meteorite: Spell = {
    id: 'meteorite',
    description: "Send a little meteorite towards your enemies!",
    action: "projectile",

    color: '#ff0066',
    icon: "fragmentedMeteor",

    maxAngleDiffInRevs: 0.01,
    cooldown: 5 * TicksPerSecond,
    throttle: true,

    projectile: {
        density: 100,
        radius: 0.015,
        speed: 0.3,
        restitution: 0,
        minTicks: 1,
        maxTicks: 2 * TicksPerSecond,
        hitInterval: 120,
        damage: 0,
        shieldTakesOwnership: false,
        categories: Categories.Projectile | Categories.Massive,
        collideWith: Categories.All,
        expireOn: Categories.None,

        sound: "meteorite",
        color: '#ff0066',
        renderers: [
            { type: "projectile", ticks: 10, smoke: 0.5, fade: "#333" },
            { type: "strike", ticks: 10, glow: true, growth: 0.1 },
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
    chargeTicks: 0.4 * TicksPerSecond,
    cooldown: 7.5 * TicksPerSecond,
    throttle: true,
    revsPerTickWhileCharging: 0.0025,
    revsPerTickWhileChannelling: 0.00005,

    knockbackCancel: {
        cooldownTicks: 0.5 * TicksPerSecond,
        maxChannelingTicks: 1 * TicksPerSecond,
    },
    movementCancel: true,
    interruptibleAfterTicks: 0,
    jitterRatio: 0.0,

    intervalTicks: 0.1 * TicksPerSecond,
    lengthTicks: 3 * TicksPerSecond,

    projectile: {
        density: 0.0001,
        radius: 0.005,
        speed: 3.0,
        maxTicks: 0.5 * TicksPerSecond,
        damage: 5,
        lifeSteal: 0.2,
        damageScaling: false,
        knockbackScaling: false,
        categories: Categories.Projectile | Categories.Massive,

        sound: "kamehameha",
        color: '#ffffff',
        renderers: [
            { type: "ray", intermediatePoints: true, ticks: 60, glow: 0.1 },
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
    cooldown: 7.5 * TicksPerSecond,
    throttle: true,
    chargeTicks: 0.1 * TicksPerSecond,

    projectile: {
        density: 4,
        radius: 0.0025,
        speed: 3.0,
        maxTicks: 0.5 * TicksPerSecond,
        collideWith: Categories.All ^ Categories.Projectile,
        damage: 0,

        sound: "lightning",
        color: '#00ddff',
        renderers: [
            { type: "ray", intermediatePoints: true, ticks: 30 },
            { type: "strike", ticks: 30, glow: true },
        ],
    },
};
const homing: Spell = {
    id: 'homing',
    description: "Follows the enemy. High damage, but only if the enemy doesn't know how to dodge.",
    action: "projectile",

    color: '#44ffcc',
    icon: "boltSaw",

    cooldown: 9 * TicksPerSecond,
    throttle: true,
    maxAngleDiffInRevs: 0.01,

    projectile: {
        density: 25,
        radius: 0.003,
        speed: 0.15,
        maxTicks: 4 * TicksPerSecond,
        damage: 12,
        lifeSteal: 0.2,
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
        color: '#44ffcc',
        renderers: [
            { type: "projectile", ticks: 1 },
            { type: "ray", ticks: 30 },
            { type: "strike", ticks: 30, growth: 1, glow: true, numParticles: 10 },
        ],
    },
};
const boomerang: Spell = {
    id: 'boomerang',
    name: 'Orbiter',
    description: "Around and around you. Keep following your enemies at orbital distance until it hits.",
    action: "projectile",

    color: '#ff00ff',
    icon: "boomerangSun",

    maxAngleDiffInRevs: 0.01,
    cooldown: 7.5 * TicksPerSecond,
    throttle: true,

    projectile: {
        density: 1,
        restitution: 0,
        radius: 0.004,
        speed: 0.6,
        maxTicks: 5.0 * TicksPerSecond,
        damage: 15,
        lifeSteal: 0.2,
        noKnockback: true,
        expireOn: Categories.Hero | Categories.Massive,
        expireAgainstHeroes: Alliances.Enemy,
        hitInterval: 15, // So repeated hits to obstacles work
        shieldTakesOwnership: false,

        behaviours: [
            {
                type: "homing",
                revolutionsPerSecond: 1,
                maxTurnProportion: 0.0625,
                minDistanceToTarget: 0.075,
                targetType: HomingTargets.self,
            },
        ],

        color: '#ff00ff',
        sound: "boomerang",
        soundHit: "standard",
        renderers: [
            { type: "projectile", selfColor: true, ticks: 10 },
            { type: "ray", selfColor: true, ticks: 10 },
            { type: "ray", selfColor: true, radiusMultiplier: 0.25, ticks: 60 },
            { type: "strike", selfColor: true, ticks: 15, glow: true, numParticles: 5 },
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
    cooldown: 1.5 * TicksPerSecond,
    throttle: true,

    retractCooldownTicks: 0,
    retractBehaviours: [
        {
            type: "homing",
            targetType: "cursor",
            newSpeed: 0.4,
            redirect: true,
        },
    ],

    projectile: {
        damage: 0,
        lifeSteal: 0.2,
        density: 3,
        radius: 0.007,
        speed: 0.25,
        maxTicks: 5.0 * TicksPerSecond,
        collideWith: Categories.All,
        expireOn: Categories.Hero | Categories.Massive | Categories.Obstacle,
        categories: Categories.Projectile,

        partialDamage: {
            initialMultiplier: 0.01,
            ticks: 3 * TicksPerSecond,
        },

        detonate: {
            damage: 33,
            lifeSteal: 0.2,
            radius: 0.025,
            minImpulse: 0,
            maxImpulse: 0,
            renderTicks: 10,
        },

        sound: "retractor",
        color: '#00ff7f',
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
            { type: "projectile", ticks: 1, glow: 0.1 },
            { type: "ray", ticks: 15, glow: 0.1 },
            { type: "strike", ticks: 15, glow: true, numParticles: 9 },
        ],
    },
};
const backlash: Spell = {
    id: 'backlash',
    name: 'Boomerang',
    description: "Away and back. Hit your enemy twice, if you can.",
    action: "projectile",

    color: '#00ccff',
    icon: "crackedBallDunk",

    maxAngleDiffInRevs: 0.01,
    cooldown: 1.5 * TicksPerSecond,
    throttle: true,

    projectile: {
        damage: 10,
        lifeSteal: 0.2,
        density: 1,
        restitution: 0,
        radius: 0.002,
        speed: 0.5,
        maxTicks: 2 * TicksPerSecond,
        categories: Categories.Projectile,
        sense: Categories.Hero,
        collideWith: Categories.All ^ Categories.Hero,
        expireOn: Categories.Projectile ^ Categories.Hero,
        expireAgainstHeroes: Alliances.Self,
        shieldTakesOwnership: false,

        behaviours: [
            {
                trigger: { afterTicks: 36 },
                type: "homing",
                revolutionsPerSecond: 1,
                targetType: "self",
            },
            {
                trigger: { afterTicks: 36 },
                type: "clearHits",
            },
        ],

        sound: "backlash",
        color: '#00ccff',
        renderers: [
            { type: "polygon", ownerColor: true, numPoints: 3, radiusMultiplier: 3, revolutionInterval: 11, ticks: 1 },
            { type: "ray", ownerColor: true, ticks: 15 },
            { type: "strike", color: '#fff', ticks: 15, growth: 1.5, glow: true, numParticles: 9, speedMultiplier: -0.5 },
        ],
    },
};
const rocket: Spell = {
    id: 'rocket',
    name: 'Spirit Missile',
    description: "You control Spirit Missile while it is flying, but while doing this, you cannot move. However, enemies hit will be unable to move for 1 second. Cast Spirit Missile again to detonate it at exactly the right moment.",
    action: "focus",

    color: '#ff8855',
    icon: "mightyForce",

    maxAngleDiffInRevs: 0.01,
    cooldown: 5 * TicksPerSecond,
    throttle: true,

    interruptibleAfterTicks: 0,
    movementProportionWhileChannelling: 0.05,

    projectile: {
        damage: 0,
        density: 1,
        radius: 0.005,
        speed: 0.15,
        maxTicks: 2.25 * TicksPerSecond,
        collideWith: Categories.All,
        expireOn: Categories.All ^ Categories.Shield,
        shieldTakesOwnership: false,

        partialDamage: {
            initialMultiplier: 0.5,
            ticks: 1 * TicksPerSecond,
        },

        detonate: {
            damage: 0,
            radius: 0.035,
            minImpulse: 0.0003,
            maxImpulse: 0.0004,
            renderTicks: 10,

            buffs: [
                {
                    type: "movement",
                    maxTicks: 1 * TicksPerSecond,
                    movementProportion: 0,
                }
            ],
        },

        partialDetonateRadius: {
            initialMultiplier: 0.5,
            ticks: 1 * TicksPerSecond,
        },

        strafe: {
            expireOnHeroHit: true,
        },

        behaviours: [
            {
                type: "homing",
                targetType: "follow",
                revolutionsPerSecond: 0.0075,
            },
            { type: "expireOnChannellingEnd" },
        ],

        sound: "rocket",
        color: '#ff9a00',
        renderers: [
            { type: "reticule", color: 'rgba(255, 255, 255, 0.1)', radius: 0.035, minRadius: 0.03, usePartialDamageMultiplier: true },
            { type: "projectile", ticks: 5, glow: 0.1, smoke: 0.5, ownerColor: true },
            { type: "strike", ticks: 20, glow: true, numParticles: 9 },
        ],
    },
};


const whip: Spell = {
    id: 'whip',
    name: 'Electroshock',
    description: "Shock your enemies for damage and lifesteal. The whip has a fixed length, so stay close, but not too close.",
    action: "projectile",

    color: '#39fffa',
    icon: "electricWhip",

    maxAngleDiffInRevs: 0.01,
    chargeTicks: 10,
    cooldown: 1.5 * TicksPerSecond,
    throttle: true,

    projectile: {
        density: 2,
        radius: 0.001,
        speed: 2,
        maxTicks: 1,
        damage: 0,
        categories: Categories.Projectile,
        collideWith: Categories.Obstacle | Categories.Shield | Categories.Massive,
        expireOn: Categories.None,
        strafe: {},
        shieldTakesOwnership: false,
        damageScaling: false,
        knockbackScaling: false,

        detonate: {
            damage: 32,
            lifeSteal: 1,
            radius: 0.0125,
            minImpulse: 0.0002,
            maxImpulse: 0.0002,
            renderTicks: 10,
            damageScaling: false,
            knockbackScaling: false,
        },

        sound: "whip",
        color: '#fffcb1',
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
            { type: "link", color: '#fffcb1', width: Pixel * 5, glow: 0.25 },
            { type: "strike", ticks: 30, glow: true, numParticles: 7 },
        ],
    },
};

const link: Spell = {
    id: 'link',
    description: "Pull your enemy to you. While linked, all received damage is instead applied to your enemy.",
    action: "projectile",

    color: '#0000ff',
    icon: "andromedaChain",

    maxAngleDiffInRevs: 0.01,
    cooldown: 7.5 * TicksPerSecond,
    throttle: false,

    projectile: {
        density: 1,
        knockbackScaling: false,
        radius: 0.005,
        speed: 0.3,
        strafe: {},
        restitution: 0,
        maxTicks: 1.75 * TicksPerSecond,
        damage: 0,
        collideWith: Categories.Hero | Categories.Obstacle | Categories.Shield | Categories.Massive,
        expireOn: Categories.Hero | Categories.Massive,
        shieldTakesOwnership: false,

        link: {
            linkWith: Categories.Hero,
            impulsePerTick: 1.0 / TicksPerSecond,
            selfFactor: 0,
            targetFactor: 1,
            minDistance: 0.025,
            maxDistance: 0.1,
            linkTicks: 1.5 * TicksPerSecond,

            redirectDamageProportion: 1,

            render: {
                type: "link",
                color: '#4444ff',
                width: 5 * Pixel,
                glow: 0.1,
            },
        },

        behaviours: [
            {
                type: "homing",
                trigger: { afterTicks: 45 },
                targetType: HomingTargets.self,
                newSpeed: 0.4,
                redirect: true,
            },
            {
                type: "expireOnOwnerDeath",
            },
        ],

        sound: "link",
        color: '#4444ff',
        renderers: [
            { type: "polygon", color: '#4444ff', numPoints: 3, radiusMultiplier: 2, revolutionInterval: 23, ticks: 1 },
            {
                type: "link",
                color: '#4444ff',
                width: 5 * Pixel,
                glow: 0.1,
            },
        ],
    },
};
const grapple: Spell = {
    id: 'grapple',
    description: "Attach yourself to things and gain a 2x movement speed boost. Swing around while attacking and dodging at super speed!",
    action: "projectile",

    color: '#ff2200',
    icon: "grapple",

    maxAngleDiffInRevs: 0.01,
    cooldown: 5 * TicksPerSecond,
    throttle: false,
    unlink: true,

    projectile: {
        density: 1,
        knockbackScaling: false,
        radius: 0.005,
        speed: 0.8,
        maxTicks: 0.4 * TicksPerSecond,
        damage: 0,
        collideWith: Categories.All ^ Categories.Projectile,
        expireOn: Categories.Hero | Categories.Obstacle | Categories.Massive,
        expireOnMirror: true,
        shieldTakesOwnership: false,

        link: {
            linkWith: Categories.Hero | Categories.Obstacle,
            selfFactor: 1,
            targetFactor: 0.1,
            impulsePerTick: 2.0 / TicksPerSecond,
            minDistance: 0.05,
            maxDistance: 0.25,
            linkTicks: 1 * TicksPerSecond,

            render: {
                type: "link",
                color: '#ff2200',
                width: 5 * Pixel,
                glow: 0.1,
            },
        },

        buffs: [
            {
                collideWith: Categories.All,
                owner: true,
                type: "movement",
                maxTicks: 5 * TicksPerSecond,
                linked: true,
                movementProportion: 2,
            }
        ],

        behaviours: [
            { type: "expireOnOwnerDeath" },
        ],

        sound: "grapple",
        color: '#ff2200',
        renderers: [
            { type: "polygon", color: '#ff2200', numPoints: 3, radiusMultiplier: 2, revolutionInterval: 31, ticks: 1 },
            {
                type: "link",
                color: '#ff2200',
                width: 3 * Pixel,
                glow: 0.1,
            },
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
    cooldown: 7.5 * TicksPerSecond,
    throttle: true,

    projectile: {
        density: 3.75,
        radius: 0.001,
        speed: 1,
        fixedSpeed: true,
        maxTicks: 3.0 * TicksPerSecond,
        hitInterval: 15,
        damage: 5,
        knockbackScaling: false,
        lifeSteal: 0.2,
        collideWith: Categories.All ^ Categories.Projectile,
        expireOn: Categories.Massive,
        bounce: {
        },

        sound: "bouncer",
        color: '#88ee22',
        renderers: [
            { type: "ray", intermediatePoints: true, selfColor: true, ticks: 60 },
            { type: "strike", selfColor: true, ticks: 15, glow: true, growth: 1 },
        ],
    },
};
const repeater: Spell = {
    id: 'repeater',
    description: "Every time Repeater hits, the cooldown resets and you can shoot it again immediately. Takes 0.25 seconds to grow to full damage, so hit from a distance for maximum damage.",
    action: "projectile",

    color: '#00ff00',
    icon: "sonicLightning",

    maxAngleDiffInRevs: 0.01,
    cooldown: 7.5 * TicksPerSecond,
    chargeTicks: 3,
    throttle: true,

    projectile: {
        density: 10,
        radius: 0.002,
        speed: 0.8,
        maxTicks: 1 * TicksPerSecond,
        damage: 15,
        lifeSteal: 0.2,
        collideWith: Categories.All ^ Categories.Projectile,
        expireOn: Categories.All ^ Categories.Shield,
        partialDamage: {
            initialMultiplier: 0.25,
            ticks: 0.25 * TicksPerSecond,
        },

        buffs: [
            {
                type: "cooldown",
                owner: true,
                maxTicks: 1,
                against: Alliances.Enemy, // Otherwise will repeat when we hit anything
                spellId: "repeater",
                maxCooldown: 0,
                sound: "repeater",
                color: '#00ff00',
            },
        ],

        sound: "repeater",
        color: '#00ff00',
        renderers: [
            { type: "projectile", ticks: 18 },
            { type: "ray", intermediatePoints: true, ticks: 12, glow: 0.1, radiusMultiplier: 0.5 },
            { type: "strike", ticks: 18, glow: true, growth: 1, numParticles: 5 },
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
    throttle: true,

    projectile: {
        sound: "drain",

        density: 2,
        radius: 0.002,
        speed: 0.2,
        maxTicks: 2.0 * TicksPerSecond,
        damage: 12,
        lifeSteal: 1.0,

        behaviours: [
            {
                type: "homing",
                targetType: "enemy",
                trigger: { atCursor: true },
                newSpeed: 0.15,
                redirect: true,
            },
        ],

        color: '#22ee88',
        renderers: [
            { type: "projectile", ticks: 1 },
            { type: "ray", ticks: 15 },
            { type: "ray", intermediatePoints: true, radiusMultiplier: 0.25, ticks: 45 },
            { type: "strike", ticks: 30, growth: 2, glow: true, numParticles: 4 },
        ],
    },
};

const renderGravity: RenderSwirl = {
    type: "swirl",

    color: '#0ace00',
    radius: 0.02,
    ticks: 0.25 * TicksPerSecond,

    loopTicks: 20,

    numParticles: 3,
    particleRadius: 0.02 / 3,

    glow: 0.1,

};
const gravity: Spell = {
    id: 'gravity',
    name: 'Ensnare',
    description: "Hold an enemy in place while you unleash your volleys upon them. Your enemy will be unable to cast spells for 0.75 seconds.",
    action: "projectile",

    color: '#0ace00',
    icon: "atomicSlashes",
    sound: "gravity",

    maxAngleDiffInRevs: 0.01,
    cooldown: 7.5 * TicksPerSecond,
    throttle: true,
    chargeTicks: 0.1 * TicksPerSecond,

    projectile: {
        density: 0.0001,
        radius: 0.0125,
        speed: 0.3,
        maxTicks: 5.0 * TicksPerSecond,
        damage: 0,
        noHit: true,
        collideWith: Categories.Hero | Categories.Massive,

        gravity: {
            impulsePerTick: 0.001 / TicksPerSecond,
            ticks: 2 * TicksPerSecond,
            radius: 0.04,
            power: 1,
            render: renderGravity,
        },

        buffs: [
            {
                type: "cooldown",
                against: Alliances.NotFriendly,
                maxTicks: 1,
                minCooldown: 0.75 * TicksPerSecond,
            },
        ],

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
        color: '#0ace00',
        renderers: [
            renderGravity,
        ],
    },
};
const whirlwind: Spell = {
    id: 'whirlwind',
    name: 'Freezing Breath',
    description: "Enemies caught in your freezing breath will be slowed for 2 seconds. The freezing whirlwind will also catch enemy projectiles.",
    action: "projectile",

    color: '#44ffff',
    icon: "snowflake1",
    sound: "whirlwind",

    maxAngleDiffInRevs: 0.01,
    cooldown: 5 * TicksPerSecond,
    throttle: true,
    chargeTicks: 0.1 * TicksPerSecond,

    projectile: {
        categories: Categories.Massive,
        density: 0.0001,
        radius: 0.03,
        speed: 0.15,
        maxTicks: 2 * TicksPerSecond,
        damage: 0,
        damageScaling: false,
        collideWith: Categories.Hero,
        expireOn: Categories.None,
        sensor: true,
        noKnockback: true,

        hitInterval: 15,
        behaviours: [
            {
                type: "attract",
                collideLike: Categories.Massive,
                categories: Categories.Projectile,
                notCategories: Categories.Massive,
                against: Alliances.NotFriendly,
                radius: 0.04,
                accelerationPerTick: 0.1,
                maxSpeed: 0.4,
            },
        ],

        buffs: [
            {
                type: "movement",
                movementProportion: 0.5,
                maxTicks: 2 * TicksPerSecond,
                against: Alliances.NotFriendly,
                render: {
                    color: "rgba(64, 255, 255, 1)",
                    alpha: 0.3,
                    ticks: 15,
                    emissionRadiusFactor: 1,
                    particleRadius: 0.01,
                },
            },
        ],

        sound: "whirlwind",
        color: "#44ffff",
        renderers: [
            {
                type: "swirl",

                color: "rgba(64, 255, 255, 0.25)",
                radius: 0.01,
                ticks: 20,

                loopTicks: 13,

                numParticles: 2,
                particleRadius: 0.02,

                smoke: 1.3,
                fade: "#144",
            },
            { type: "strike", ticks: 20, glow: true, growth: 0.1 },
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
    cooldown: 7.5 * TicksPerSecond,
    throttle: true,

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
        color: '#ff9a00',
        renderers: [
            { type: "ray", ticks: 30 },
            {
                type: "reticule",
                color: '#ff9a00',
                minRadius: 0.049,
                remainingTicks: 0.5 * TicksPerSecond,
                shrinkTicks: 0.5 * TicksPerSecond,
                radius: 0.05,
            },
        ],
    },
};

const halo: Spell = {
    id: 'halo',
    name: 'Halo',
    description: "Build up to 3 charges of your halo, then touch your enemy to lifesteal. Halo increases your movement speed by 10%. Watch out, you lose your halo every time you are hit, so keep dodging!",
    action: "projectile",

    color: '#ffaa77',
    icon: "angelOutfit",

    maxAngleDiffInRevs: 0.01,
    cooldown: 5 * TicksPerSecond,
    throttle: true,

    buffs: [
        {
            type: "movement",
            maxTicks: 20 * TicksPerSecond,
            movementProportion: 1.1,
            cancelOnHit: true,
        },
    ],

    projectile: {
        density: 1,
        radius: 0.002,
        speed: 0.5,
        maxTicks: 20 * TicksPerSecond,
        hitInterval: 15,
        damage: 3,
        lifeSteal: 1,
        collideWith: Categories.Hero | Categories.Shield | Categories.Massive,
        expireOn: Categories.Massive,
        expireAgainstHeroes: Alliances.NotFriendly,
        expireAgainstObjects: Alliances.NotFriendly,
        selfPassthrough: true,
        shieldTakesOwnership: false,
        strafe: { expireOnHeroHit: true },
        destructible: {
            against: Alliances.NotFriendly,
        },

        behaviours: [
            {
                type: "homing",
                revolutionsPerSecond: 1,
                maxTurnProportion: 0.15,
                minDistanceToTarget: 0.02,
                targetType: HomingTargets.self,
            },
        ],

        sound: "halo",
        soundHit: "halo",
        color: '#ccc',
        renderers: [
            { type: "ray", selfColor: true, ownerColor: true, ticks: 15 },
            { type: "strike", selfColor: true, ownerColor: true, ticks: 15, growth: 1.1, glow: true, numParticles: 3 },
        ],
    },
};

const mines: Spell = {
    id: 'mines',
    name: 'Energy Mines',
    description: "Mark out your territory with some Energy Mines. If you walk away from the mines, they expire. Energy mines only do damage after 0.1 seconds.",
    action: "spray",
    sound: "mines",

    color: '#ff009c',
    icon: "mineExplosion",

    maxAngleDiffInRevs: 0.01,
    cooldown: 5 * TicksPerSecond,
    throttle: true,

    intervalTicks: 1,
    lengthTicks: 7,

    jitterRatio: 1.0,

    projectile: {
        density: 1,
        radius: 0.004,
        speed: 0.5,
        maxTicks: 4.5 * TicksPerSecond,
        minTicks: 1, // Ensure mines knockback on their first tick
        damage: 0,
        lifeSteal: 0.2,

        categories: Categories.Projectile,
        collideWith: Categories.Hero | Categories.Obstacle | Categories.Massive, // Passes through shield
        expireOn: Categories.All ^ Categories.Shield,
        destructible: {
        },

        partialDamage: {
            initialMultiplier: 0.001,
            ticks: 6,
            step: true,
        },

        detonate: {
            damage: 3,
            lifeSteal: 0.2,
            radius: 0.015,
            minImpulse: 0.0001,
            maxImpulse: 0.0001,
            renderTicks: 15,
        },
        shieldTakesOwnership: false,

        behaviours: [
            {
                type: "homing",
                targetType: "cursor",
                trigger: { afterTicks: 6 },
                newSpeed: 0,
                redirect: true,
            },
            {
                type: "expireOnOwnerRetreat",
                maxDistance: 0.1,
            },
        ],

        sound: "mines",
        color: '#ff009c',
        renderers: [
            { type: "projectile", ticks: 1, selfColor: true, glow: 0.2, noPartialRadius: true },
            { type: "ray", intermediatePoints: true, ticks: 3, selfColor: true, noPartialRadius: true },
        ],
    },
};

const horcrux: Spell = {
    id: 'horcrux',
    name: 'Horcrux',
    description: "As long as your Horcrux is alive, you cannot die. The Horcrux will lifesteal from any nearby enemies, but will not kill them. Your Horcrux is fragile, so shoot it close to your enemy, but don't let it touch them or it will break!",
    action: "projectile",
    sound: "horcrux",

    color: '#22ee88',
    icon: "burningEye",

    maxAngleDiffInRevs: 0.01,
    cooldown: 7.5 * TicksPerSecond,
    throttle: true,

    projectile: {
        density: 10,
        restitution: 0,
        radius: 0.003,
        speed: 0.35,

        maxTicks: 2 * TicksPerSecond,
        minTicks: 1,
        damage: 0,
        lifeSteal: 1,

        collideWith: Categories.Hero | Categories.Obstacle | Categories.Massive | Categories.Shield,
        expireOn: Categories.Hero | Categories.Massive,
        destructible: {},

        horcrux: {},

        shieldTakesOwnership: false,

        behaviours: [
            {
                type: "updateCollideWith",
                trigger: { afterTicks: 60, atCursor: true },
                collideWith: Categories.All,
            },
            {
                type: "homing",
                targetType: "cursor",
                trigger: { afterTicks: 60, atCursor: true },
                newSpeed: 0,
                redirect: true,
            },
            {
                type: "aura",
                trigger: { afterTicks: 60, atCursor: true },
                radius: 0.035,
                tickInterval: 10,
                buffs: [
                    {
                        type: "burn",
                        against: Alliances.NotFriendly,
                        hitInterval: 10,
                        packet: { damage: 2.5, lifeSteal: 1, minHealth: 1, noHit: true, noKnockback: true },
                        maxTicks: 10,
                        render: {
                            color: "#22ee88",
                            alpha: 0.3,
                            ticks: 15,
                            emissionRadiusFactor: 1,
                            particleRadius: 0.5 * Hero.Radius,
                        },
                    },
                ]
            },
        ],

        sound: "horcrux",
        color: '#22ee88',
        renderers: [
            { type: "reticule", color: 'rgba(34, 238, 136, 0.1)', radius: 0.035, minRadius: 0.03, shrinkTicks: 13, grow: true, fade: true, repeat: true },
            { type: "polygon", color: 'rgba(34, 238, 136, 0.5)', numPoints: 5, radiusMultiplier: 2.5, revolutionInterval: 60, ticks: 1 },
            { type: "projectile", ticks: 10, glow: 0.1, smoke: 0.3 },
            { type: "strike", ticks: 10, glow: true, growth: 1.25, numParticles: 5 },
            { type: "reticule", color: 'rgba(34, 238, 136, 0.5)', radius: 0.035, minRadius: 0.03, shrinkTicks: 10, startingTicks: 10 },
            {
                type: "link",
                color: 'rgba(255, 255, 255, 0.1)',
                width: 1 * Pixel,
                glow: 0.1,
            },
        ],
    },
};

const saber: Spell = {
    id: 'saber',
    name: 'Lightsaber',
    description: "Swing your lightsaber to deflect projectiles and knockback enemies!",
    untargeted: true,

    unlink: true,
    takesOwnership: true,
    blocksTeleporters: false,
    shiftMultiplier: 0.25,
    speedMultiplier: 2,
    maxSpeed: 0.75,
    maxTurnRatePerTickInRevs: 0.1,

    angleOffsetsInRevs: [0],
    width: Pixel,
    length: 0.075,

    movementProportionWhileChannelling: 0.5,
    interruptibleAfterTicks: 20,

    cooldown: 10 * TicksPerSecond,
    throttle: false,

    icon: "waveStrike",

    maxTicks: 1.5 * TicksPerSecond,

    categories: Categories.Shield,
    collidesWith: Categories.Hero | Categories.Projectile,

    trailTicks: 5,
    color: '#00ccff',

    sound: "saber",
    action: "saber",
};

const dualSaber: Spell = {
    id: 'dualSaber',
    name: 'Dualsaber',
    description: "Swing dual lightsabers to deflect projectiles and knockback enemies!",
    untargeted: true,

    unlink: true,
    takesOwnership: true,
    blocksTeleporters: false,
    shiftMultiplier: 0.25,
    speedMultiplier: 2,
    maxSpeed: 0.75,
    maxTurnRatePerTickInRevs: 0.1,

    angleOffsetsInRevs: [-0.25, 0.25],
    width: Pixel,
    length: 0.06,

    movementProportionWhileChannelling: 0.65,
    interruptibleAfterTicks: 20,

    cooldown: 10 * TicksPerSecond,
    throttle: false,

    icon: "waveStrike",

    maxTicks: 1.5 * TicksPerSecond,

    categories: Categories.Shield,
    collidesWith: Categories.Hero | Categories.Projectile,

    trailTicks: 5,
    color: '#ff0044',

    sound: "saber",
    action: "saber",
};

const scourge: Spell = {
    id: 'scourge',
    name: 'Overload',
    description: "After a short charging time, unleash a melee-range explosion that will send your enemies flying. Be careful though, this spell is so powerful it costs you some health too.",
    untargeted: true,

    detonate: {
        damage: 15,
        radius: Hero.Radius * 4,
        minImpulse: 0.0002,
        maxImpulse: 0.0005,
        renderTicks: 30,
    },
    chargeTicks: 0.5 * TicksPerSecond,
    cooldown: 5 * TicksPerSecond,
    throttle: false,
    unlink: true,
    interruptibleAfterTicks: 0,
    movementCancel: true,
    selfDamage: 10,
    minSelfHealth: 1,

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

    maxTicks: 1.5 * TicksPerSecond,
    cooldown: 10 * TicksPerSecond,
    throttle: false,
    radius: Hero.Radius * 2,
    takesOwnership: true,
    blocksTeleporters: false,

    icon: "shieldReflect",

    color: '#3366ff',
    glow: 0.25,

    action: "shield",
    sound: "shield",
};
const icewall: Spell = {
    id: 'icewall',
    name: 'Forcefield',
    description: "Create a wall that reflects projectiles and blocks other heroes. You can pass through your own forcefield, but other heroes cannot, even if they are using teleport.",

    maxRange: 0.25,
    movementProportionWhileCharging: 1.0,
    maxTicks: 1.5 * TicksPerSecond,
    growthTicks: 5,
    cooldown: 10 * TicksPerSecond,
    throttle: false,
    takesOwnership: true,
    blocksTeleporters: true,

    length: 0.005,
    width: 0.15,

    categories: Categories.Shield | Categories.Obstacle,
    selfPassthrough: true,

    icon: "woodenFence",

    color: '#0088ff',
    glow: 0.25,

    action: "wall",
    sound: "icewall",
};
const teleport: Spell = {
    id: 'teleport',
    description: "Teleport to a nearby location. Get close, or get away.",

    range: 0.3,
    maxAngleDiffInRevs: 1.0,
    cooldown: 10 * TicksPerSecond,
    throttle: false,
    unlink: true,
    debuff: true,
    chargeTicks: 6,
    movementProportionWhileCharging: 1.0,

    icon: "teleport",

    color: '#6666ff',

    action: "teleport",
    sound: "teleport",
};
const thrust: Spell = {
    id: 'thrust',
    name: 'Charge',
    description: "Accelerate quickly, knocking away anything in your path.",

    range: 0.4,
    radiusMultiplier: 1.5,
    maxAngleDiffInRevs: 0.01,
    cooldown: 10 * TicksPerSecond,
    throttle: false,
    debuff: true,

    damageTemplate: {
        damage: 0,
    },
    speed: 1.5,
    bounceTicks: 3,

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
    throttle: false,

    projectile: {
        density: 0.001,
        radius: 0.005,
        speed: 0.8,
        maxTicks: 0.75 * TicksPerSecond,
        damage: 0,
        categories: Categories.Projectile,
        collideWith: Categories.All ^ Categories.Projectile,
        expireOn: Categories.All, // Expire on a shield, don't bounce off it
        expireOnMirror: true,
        expireAfterCursorTicks: 0,
        shieldTakesOwnership: false,
        selfPassthrough: true,

        swapWith: Categories.Hero | Categories.Obstacle | Categories.Massive,

        behaviours: [
            { type: "expireOnOwnerDeath" },
        ],

        buffs: [
            {
                collideWith: Categories.All,
                type: "debuff",
                owner: true,
                maxTicks: 1,
            },
        ],

        sound: "swap",
        color: '#75e7ff',
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
            { type: "link", color: '#75e7ff', width: Pixel * 5, glow: 0.25 },
            { type: "strike", color: '#75e7ff', glow: true, ticks: 15, numParticles: 9 },
        ],
    },
};
const voidRush: Spell = {
    id: 'voidRush',
    name: 'Void Rush',
    description: "For 2.5 seconds, increase movement speed 75%, and also become immune to damage from the void.",

    untargeted: true,
    maxAngleDiffInRevs: 1.0,
    cooldown: 10 * TicksPerSecond,
    throttle: false,
    debuff: true,

    buffs: [
        {
            type: "movement",
            movementProportion: 1.75,
            maxTicks: 2.5 * TicksPerSecond,
        },
        {
            type: "lavaImmunity",
            damageProportion: 0,
            maxTicks: 2.5 * TicksPerSecond,
            sound: "voidRush-lavaImmunity",
            render: {
                color: "#8800ff",
                heroColor: true,
                ticks: 60,
                emissionRadiusFactor: 0,
                particleRadius: Hero.Radius,
                decay: true,
            },
        },
    ],

    icon: "sprint",
    color: '#8800ff',
    action: "buff",
};
const vanish: Spell = {
    id: 'vanish',
    name: 'Vanish',
    description: "Vanish from sight for 2.5 seconds, and also increase movement speed 75%.",

    untargeted: true,
    maxAngleDiffInRevs: 1.0,
    cooldown: 10 * TicksPerSecond,
    throttle: false,
    unlink: true,
    debuff: true,
    movementProportionWhileChannelling: 1.75,
    interruptibleAfterTicks: 15,

    buffs: [
        {
            type: "vanish",
            maxTicks: 2.5 * TicksPerSecond,
            channelling: true,
            sound: "vanish",
        },
    ],

    icon: "hidden",
    color: '#00aaff',
    action: "buff",
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
    difire,
    meteor,
    meteorite,
    gravity,
    whirlwind,
    link,
    grapple,
    kamehameha,
    lightning,
    homing,
    boomerang,
    retractor,
    backlash,
    rocket,
    whip,
    bouncer,
    repeater,
    drain,
    icewall,
    horcrux,
    saber,
    dualSaber,
    scourge,
    shield,
    supernova,
    halo,
    mines,
    teleport,
    thrust,
    swap,
    voidRush,
    vanish,
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
    ObstacleTemplates,
    Choices,
    Spells,
    Layouts,
    Sounds,
    Icons,
};