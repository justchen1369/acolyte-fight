import _ from 'lodash';
import { TicksPerSecond, Categories, Pixel, Alliances } from './constants';
import { Icons } from './icons';
import { Layouts } from './layouts';
import { ObstacleTemplates } from './obstacleTemplates';
import { Sounds } from './sounds';
import { Actions, SpecialKeys, HomingTargets } from './world.model';

// @ts-ignore
import Code from '!!raw-loader!./default.ai.js';

const lifeSteal = 0.3;

const Matchmaking: MatchmakingSettings = {
    MaxPlayers: 7,
    MinBots: 1,
    MaxBots: 2,
    NumGamesToMaxBotDifficulty: 100,
    EnableSingles: false, // TODO
    EnableSplitting: false, // TODO
    EnableTeams: true,
    PvE: false,
    AllowBotTeams: false,
    AllowUnevenTeams: false,
    TeamsMinGames: 0, // TODO
    BotRating: 1500,
    RatingPower: 2,
    OddPenalty: 0.75,
    SmallPenalty: 0.5,
    SamePenalty: 0.5,
    TeamPenaltyPower: 0,
};

const Hero: HeroSettings = {
    MoveSpeedPerSecond: 0.12,
    MaxSpeed: 1.0,
    Radius: 0.0125,
    Density: 0.72,

    AngularDamping: 100,
    Damping: 3,

    DamageMitigationTicks: 5 * TicksPerSecond,
    MaxCooldownWaitTicks: 1,
    ThrottleTicks: 0,

    MaxHealth: 100,
    SeparationImpulsePerTick: 0.01,

    RevolutionsPerTick: 1.0,
}

const recoverySpellIds = [
    "teleport",
    "thrust",
    "swap",
    "vanish",
    "voidRush",
];

const World: WorldSettings = {
    InitialRadius: 0.4,
    HeroLayoutProportion: 0.625,
    HeroResetProportion: 0.625,

    LavaDamagePerSecond: 12.5,
    LavaLifestealProportion: lifeSteal,
    LavaDamageInterval: 20,
    LavaBuffs: [
        {
            type: "cooldown",
            spellIds: recoverySpellIds,
            maxTicks: 20,
            cooldownRateModifier: 1,
        },
    ],

    SecondsToShrink: 90,
    ShrinkPowerMinPlayers: 1.5,
    ShrinkPowerMaxPlayers: 0.25,

    ProjectileSpeedDecayFactorPerTick: 0.05,
    SlopSpeed: 0.001,

    SwatchHealth: 100,

    BotName: "AcolyteBot",
    DefaultGameStartMessage: "Game started. Defeat your enemies!",

    SlopRadius: 0.05,
    SwapDistanceReduction: 0.01,
}

const Obstacle: ObstacleSettings = {
	AngularDamping: 5,
	LinearDamping: 2,
    Density: 100.0,
    ReturnProportion: 0.04,
    ReturnMinSpeed: 0.02,
    ReturnTurnRate: 0.002,
}

const Visuals: VisualSettings = {
    Background: '#000',
    DefaultWorldColor: '#222',
    WorldStrokeProportion: 0.01,
    WorldStrokeBrightness: 0.05,

    WorldHexHeight: 7,
    WorldHexWidth: 10,
    WorldHexMask: 0.1,
    WorldHexInterval: 7 * TicksPerSecond,

	WorldAnimateWinTicks: 15,
    WorldWinGrowth: 0.05,
    WorldWinDarken: 0.5,

	DefaultGlowRadius: 4 * Pixel,
    GradientAngleInRevs: 3 / 8,

	ShakeDistance: 0.02,
    ShakeTicks: 11,
    ShakeCycles: 5,
    ShakeDampening: 3,

    HighlightFactor: 0.01,
    HighlightHexFactor: 0.08,
    HighlightHexShineFactor: 0.1,
	HighlightTicks: 30,

	EaseTicks: 30,
	EaseInDistance: 0.5,
	EasePower: 2.0,

    ExitTicks: 30,

    TurnHighlightTicks: 15,
    TurnHighlightRevs: 0.125,
	TurnHighlightGrowth: 0.15,
    TurnHighlightFlash: 0.1,

    CastFailedColor: "#0009",
    CastFailedRadius: 0.025,
    CastFailedLineWidth: 0.015,
    CastFailedTicks: 30,

	MyHeroColor: '#00ccff',
	AllyColor: '#00a3cc',
	BotColor: '#cccccc',
	OnlineColor: '#ccc',

	ChargingRadius: Pixel * 7,
	CastingFlashTicks: 15,

    Damage: {
        ticks: 10,
        growth: 0.25,
        bloom: 0.05,
        flash: true,
    },

    DefaultFlashTicks: 6,
    
    HeroOutlineColor: "#000",
    HeroOutlineProportion: 0.1,
    HeroGradientDarken: 0.75,
    HeroGlyphLighten: 0.5,
    HeroGlyphOpacity: 1,
    HeroShadowOpacity: 0.5,

	NameMargin: Pixel * 2,
	NameFontPixels: 9,
	NameHeightPixels: 11,
    NameWidthPixels: 100,

	HealthBarHeroRadiusFraction: 0.95,
	HealthBarHeight: Pixel * 2,
    HealthBarMargin: Pixel * 2,

	ButtonBarMaxHeightProportion: 0.15,
	ButtonBarSpacing: 8,
	ButtonBarMargin: 5,
	ButtonBarSize: 72,
    ButtonBarGap: 12,

    CursorSizeInPixels: 7,

	CameraPanRate: 0.004,
	CameraZoomRate: 0.004,

	CameraMaxZoom: 2,
	CameraMinPixelsForZoom: 640,
	CameraSmoothRate: 0.5,

	CameraCenterTolerance: 0.15,
	CameraZoomTolerance: 0.2,

	Colors: [
		"#ffb0f2",
		"#abffab",
		"#b499ff",
		"#ff99a8",
		"#70ffd4",
		"#82a7ff",
		"#d0ff61",
		"#ffcf70",
		"#6effe0",
		"#dca1ff",
	],

	TeamColors: [
        "#cb8fc1",
        "#d0c16b",
        "#7db37d",
        "#cea85c",
        "#54b7a2",
        "#a97fc1",
	],

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
            ["boost"],
            ["homing", "boomerang", "drain"],
            ["gravity", "whirlwind"],
            ["link", "grapple"],
            ["lightning"],
        ],
		"e": [
            ["armor", "horcrux"],
            ["shield", "icewall"],
            ["saber", "dualSaber"],
            ["phaseOut", "blaze"],
            ["meteor", "meteorite"],
        ],
		"r": [
            ["empower"],
            ["supernova", "rocket"],
            ["bouncer", "repeater"],
            ["kamehameha", "blast"],
        ],
		"f": [
            ["bump", "scourge"],
            ["firespray", "iceBomb"],
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

const cleanse: EffectInfo = {
    icon: "fas fa-briefcase-medical",
    title: "Cleanse",
    text: "Clears all positive and negative effects.",
};
const voidRecharge: EffectInfo = {
    icon: "fas fa-clock",
    title: "Void recharge",
    text: "Cools down 2x faster when in the void.",
};

const move: MoveSpell = {
    id: Actions.Move,
    description: "",
    color: null,
    maxAngleDiffInRevs: 0.25,
    interruptibleAfterTicks: 0,
    cooldown: 0,
    action: "move",
    cancelChanneling: false,
};
const go: MoveSpell = {
    id: Actions.MoveAndCancel,
    description: "",
    color: null,
    maxAngleDiffInRevs: 0.25,
    interruptibleAfterTicks: 0,
    cooldown: 0,
    action: "move",
    cancelChanneling: true,
};
const retarget: Spell = {
    id: Actions.Retarget,
    description: "",
    color: null,
    maxAngleDiffInRevs: 1.0,
    interruptibleAfterTicks: 0,
    cooldown: 0,
    action: "retarget",
};
const stop: Spell = {
    id: 'stop',
    description: "",
    color: 'white',
    glow: 0.5,
    maxAngleDiffInRevs: 1.0,
    interruptibleAfterTicks: 0,
    cooldown: 0,
    action: "stop",
};
const fireball: Spell = {
    id: 'fireball',
    description: "Quick cooldown and packs a punch. Good old trusty fireball.",
    action: "projectile",

    color: '#f80',
    icon: "thunderball",

    maxAngleDiffInRevs: 0.01,
    cooldown: 1.5 * TicksPerSecond,
    throttle: true,

    projectile: {
        density: 25,
        radius: 0.003,
        speed: 0.6,
        maxTicks: 1.5 * TicksPerSecond,
        damage: 16,
        lifeSteal,
        categories: Categories.Projectile,

        sound: "fireball",
        soundHit: "standard",
        color: '#f80',
        renderers: [
            { type: "bloom", radius: 0.045 },
            { type: "ray", ticks: 15, vanish: 1 },
            { type: "projectile", ticks: 30, smoke: 0.05, light: 0.6 },
            { type: "ray", ticks: 30, light: 0.6 },
            { type: "strike", ticks: 30, flash: true, numParticles: 5 },
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
        speed: 0.23,
        maxTicks: 2 * TicksPerSecond,
        damage: 0,
        lifeSteal,
        categories: Categories.Projectile,
        expireAfterCursorTicks: 0,

        detonate: {
            damage: 30,
            lifeSteal,
            radius: 0.036,
            minImpulse: 0.00015,
            maxImpulse: 0.00015,

            renderTicks: 10,
        },

        partialDetonateRadius: {
            initialMultiplier: 0.2,
            ticks: 1 * TicksPerSecond,
        },

        partialDamage: {
            initialMultiplier: 0.67,
            ticks: 0.5 * TicksPerSecond,
        },

        sound: "flamestrike",
        color: '#ff4400', 
        renderers: [
            { type: "bloom" },
            { type: "reticule", color: 'rgba(128, 32, 0, 0.1)', radius: 0.04, minRadius: 0.036, usePartialDamageMultiplier: true },
            { type: "projectile", ticks: 4, vanish: 1 },
            { type: "projectile", ticks: 18, smoke: 0.4, fade: "#333" },
            { type: "ray", ticks: 18 },
            { type: "strike", ticks: 18, flash: true, numParticles: 5 },
        ],
    },
};
const triplet: Spell = {
    id: 'triplet',
    name: 'Trifire',
    description: "Each bolt of Trifire will add another stack of 2 damage per second to your enemy. There is no limit to the number of stacks, but you must hit them with Trifire at least once every 4 seconds to keep the fire burning.",
    action: "spray",
    sound: "triplet",

    color: '#ff0088',
    icon: "tripleScratches",

    maxAngleDiffInRevs: 0,
    cooldown: 1.5 * TicksPerSecond,
    throttle: true,

    movementProportionWhileChannelling: 1.0,

    numProjectilesPerTick: 3,
    intervalTicks: 1,
    lengthTicks: 1,

    jitterRatio: 0.1,

    projectile: {
        density: 10,
        radius: 0.002,
        speed: 0.3,
        maxTicks: 2.25 * TicksPerSecond,
        damage: 0,
        lifeSteal,
        categories: Categories.Projectile,
        expireAgainstObjects: Alliances.All ^ Alliances.Self, // Don't expire when trifire expires with itself

        sound: "triplet",
        soundHit: "standard",
        color: '#ff0088',
        renderers: [
            { type: "bloom", radius: 0.02 },
            { type: "projectile", ticks: 15, smoke: 0.05, vanish: 1 },
            { type: "ray", ticks: 8, vanish: 0.5 },
            { type: "strike", ticks: 30, flash: true, numParticles: 2 },
        ],

        behaviours: [
            {
                type: "accelerate",
                accelerationPerSecond: 0.3,
                maxSpeed: 0.6,
            }
        ],

        buffs: [
            {
                type: "burn",
                collideWith: Categories.Hero | Categories.Obstacle,
                against: Alliances.NotFriendly,
                stack: "fire",
                hitInterval: TicksPerSecond / 3,
                packet: { damage: 24 / 3 / 4 / 3, lifeSteal, noHit: true }, // 3 projectiles, 4 seconds, 3 times per second
                maxTicks: 4 * TicksPerSecond,
                resetOnGameStart: true,
                render: {
                    color: "#ff0088",
                    alpha: 0.15 / 3, // 3 projectiles
                    light: 1,
                    ticks: 15,
                    emissionRadiusFactor: 1,
                    particleRadius: 0.5 * Hero.Radius,
                    shine: 0.2,
                    glow: 1,
                    bloom: 0.03,
                    vanish: 1,
                },
            },
        ],
    },
};
const difire: Spell = {
    id: 'difire',
    name: 'Difire',
    description: "Each bolt of Difire will add another stack of 2.5 damage per second to your enemy. There is no limit to the number of stacks, but you must hit them with Difire at least once every 4 seconds to keep the fire burning.",
    action: "spray",

    color: '#ff0088',
    icon: "crossedSlashes",
    sound: "triplet",

    maxAngleDiffInRevs: 0.01,
    cooldown: 1.5 * TicksPerSecond,
    throttle: true,

    movementProportionWhileChannelling: 1.0,

    numProjectilesPerTick: 2,
    intervalTicks: 1,
    lengthTicks: 1,

    jitterRatio: 1.0,

    projectile: {
        density: 7,
        radius: 0.0025,
        speed: 0.75,
        maxTicks: 1.5 * TicksPerSecond,
        damage: 0,
        lifeSteal,
        categories: Categories.Projectile,
        expireAgainstObjects: Alliances.All ^ Alliances.Self,

        sound: "triplet",
        soundHit: "standard",

        behaviours: [
            {
                type: "homing",
                targetType: "cursor",
                trigger: { afterTicks: 1 },
                redirect: true,
                newSpeed: 0.66,
            },
        ],

        color: '#ff0088',
        renderers: [
            { type: "bloom", radius: 0.02 },
            { type: "projectile", ticks: 15, smoke: 0.05, vanish: 1 },
            { type: "ray", ticks: 8, vanish: 0.5 },
            { type: "strike", ticks: 8, flash: true, numParticles: 2 },
        ],

        buffs: [
            {
                type: "burn",
                collideWith: Categories.Hero | Categories.Obstacle,
                against: Alliances.NotFriendly,
                stack: "fire",
                hitInterval: TicksPerSecond / 3,
                packet: { damage: 20 / 2 / 4 / 3, lifeSteal, noHit: true }, // 2 projectiles, 4 seconds, 3 times per second
                maxTicks: 4 * TicksPerSecond,
                resetOnGameStart: true,
                render: {
                    color: "#ff0088",
                    alpha: 0.15 / 2, // 2 projectiles
                    light: 1,
                    ticks: 15,
                    emissionRadiusFactor: 1,
                    particleRadius: 0.5 * Hero.Radius,
                    shine: 0.2,
                    glow: 1,
                    bloom: 0.03,
                    vanish: 1,
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

    jitterRatio: 0.3,

    projectile: {
        density: 1,
        ccd: false,
        collideWith: Categories.All,
        expireOn: Categories.All ^ Categories.Shield,
        radius: 0.002,
        speed: 0.5,
        maxTicks: 12,
        damage: 4,
        lifeSteal,

        color: '#ff0044',
        renderers: [
            { type: "bloom", radius: 0.02 },
            { type: "projectile", ticks: 30, light: 0.4, smoke: 0.15, vanish: 1, bloom: 0.01 },
            { type: "ray", intermediatePoints: true, ticks: 7, light: 0.4, vanish: 1 },
            { type: "strike", ticks: 30, flash: true, numParticles: 1 },
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
    cooldown: 10 * TicksPerSecond,
    throttle: true,

    projectile: {
        density: 100,
        square: true,
        ccd: false,
        attractable: false,
        linkable: true,
        swappable: true,
        radius: 0.03,
        speed: 0.2,
        speedDecayPerTick: 0.5,
        restitution: 0,
        minTicks: 1,
        maxTicks: 2 * TicksPerSecond,
        hitInterval: 120,
        damage: 0,
        shieldTakesOwnership: false,
        categories: Categories.Projectile | Categories.Massive,
        collideWith: Categories.All ^ Categories.Shield, // Shields have no effect on Meteor
        expireOn: Categories.None,

        sound: "meteor",
        color: '#ff0000',
        renderers: [
            { type: "bloom", radius: 0.06 },
            { type: "projectile", ticks: 15, light: null, shine: 0, smoke: 0.5, fade: "#333" },
            { type: "strike", ticks: 15, flash: true, growth: 0.1 },
        ],
    },
};

const meteoriteProjectile: ProjectileTemplate = {
    density: 50,
    square: true,
    ccd: false,
    attractable: false,
    swappable: true,
    linkable: true,
    radius: 0.018,
    speed: 0.3,
    speedDecayPerTick: 0.5,
    restitution: 0,
    minTicks: 1,
    maxTicks: 2 * TicksPerSecond,
    hitInterval: 120,
    damage: 0,
    shieldTakesOwnership: false,
    categories: Categories.Projectile | Categories.Massive,
    collideWith: Categories.All ^ Categories.Shield, // Shields have no effect on Meteorite
    expireOn: Categories.None,

    sound: "meteorite",
    color: '#ff0066',
    renderers: [
        { type: "bloom", radius: 0.04 },
        { type: "projectile", ticks: 12, light: null, shine: 0, smoke: 0.5, fade: "#333" },
        { type: "strike", ticks: 12, flash: true, growth: 0.1 },
    ],

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
        ...meteoriteProjectile,

        behaviours: [
            {
                type: "spawn",
                trigger: {
                    collideWith: Categories.Projectile | Categories.Shield,
                },
                projectile: {
                    ...meteoriteProjectile,
                    sound: "submeteorite",
                    maxTicks: 60,
                    radius: 0.5 * meteoriteProjectile.radius,
                },
                numProjectiles: 2,
                spread: 0.04,
                expire: true,
            },
        ],
    },
};

const kamehameha: Spell = {
    id: 'kamehameha',
    name: 'Acolyte Beam',
    description: "Unleash a beam so powerful it can wipe out a full-health enemy in seconds.",

    effects: [
        {
            icon: "fas fa-hand-paper",
            title: "Interruptible",
            text: "If you take an enemy hit, Acolyte Beam will be interrupted.",
        },
    ],

    action: "spray",
    sound: "kamehameha",

    color: '#44ddff',
    icon: "glowingHands",

    maxAngleDiffInRevs: 0.0001, // Requires a lot of accuracy for long-distance targets
    chargeTicks: 0.3 * TicksPerSecond,
    cooldown: 5 * TicksPerSecond,
    throttle: true,
    revsPerTickWhileCharging: 0,
    revsPerTickWhileChannelling: 0.00005,
	movementCancel: true,

    strikeCancel: {
        cooldownTicks: 5 * TicksPerSecond,
    },
    interruptibleAfterTicks: 0,
    interruptCancel: {
        cooldownTicks: 5 * TicksPerSecond,
        maxChannelingTicks: 0,
    },
    jitterRatio: 0.0,

    intervalTicks: 6,
    lengthTicks: 2.5 * TicksPerSecond,

    projectile: {
        density: 0.0001,
        attractable: false,
        radius: 0.005,
        speed: 3.0,
        maxTicks: 0.5 * TicksPerSecond,
        damage: 6,
        lifeSteal,
        categories: Categories.Projectile | Categories.Massive,
        swappable: false,
        destroying: true,

        sound: "kamehameha",
        color: '#ffffff',
        renderers: [
            { type: "ray", intermediatePoints: true, ticks: 60, glow: 0.1, bloom: 0.01 },
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
    recoil: 0.5,

    projectile: {
        density: 8,
        radius: 0.0025,
        speed: 3.0,
        maxTicks: 0.5 * TicksPerSecond,
        collideWith: Categories.All,
        swappable: false,
        damage: 0,

        sound: "lightning",
        color: '#00ddff',
        renderers: [
            { type: "bloom", radius: 0.05 },
            { type: "ray", intermediatePoints: true, ticks: 30, vanish: 1 },
            { type: "strike", ticks: 15, flash: true, detonate: 0.01, numParticles: 5, speedMultiplier: 0.2 },
        ],
    },
};
const blast: Spell = {
    id: 'blast',
    name: 'Acolyte Blast',
    description: "Hold down the button to charge your blast for longer. Charge for 2 seconds for maximum damage and knockback.",

    effects: [
        {
            icon: "fas fa-hand-paper",
            title: "Interruptible",
            text: "If you take an enemy hit, Acolyte Blast will be interrupted.",
        },
    ],

    action: "charge",

    color: '#0ff',
    icon: "fireRay",
    sound: "blast",

    recoil: 0.4,
    maxAngleDiffInRevs: 0.01,
    cooldown: 5 * TicksPerSecond,
    throttle: true,
    chargeTicks: 2 * TicksPerSecond,
    release: {
        maxChargeTicks: 7.5 * TicksPerSecond,
    },
    retarget: true,
    movementProportionWhileCharging: 0.5,
    strikeCancel: {
        cooldownTicks: 5 * TicksPerSecond,
    },

    chargeDamage: {
        initialMultiplier: 0,
        ticks: 2 * TicksPerSecond,
    },

    chargeRadius: {
        initialMultiplier: 0.25,
        ticks: 2 * TicksPerSecond,
    },

    chargeImpulse: {
        initialMultiplier: 0.05,
        ticks: 2 * TicksPerSecond,
    },

    projectile: {
        categories: Categories.Projectile | Categories.Massive,
        attractable: true,
        collideWith: Categories.All,
        expireOn: Categories.Hero | Categories.Obstacle | Categories.Massive,
        density: 100,
        radius: 0.015,
        speed: 0.5,
        minTicks: 3, // Enough ticks to clear any obstacles the player is touching
        lifeSteal,
        maxTicks: 2 * TicksPerSecond,
        swappable: true,
        damage: 40,

        detonate: {
            radius: 0.025,
            damage: 0,
            lifeSteal,
            minImpulse: 0.0001,
            maxImpulse: 0.0001,
            renderTicks: 0,
        },

        sound: "blast",
        color: '#0ff',
        renderers: [
            { type: "bloom", selfColor: true, radius: 0.07 },
            { type: "projectile", ticks: 10, selfColor: true, shine: 1, smoke: 0.15, glow: 0.3, vanish: 0.5 },
            { type: "strike", ticks: 10, numParticles: 10, flash: true },
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
        maxTicks: 3.5 * TicksPerSecond,
        damage: 16,
        lifeSteal,
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
            { type: "bloom" },
            { type: "projectile", ticks: 30, light: 0.5, smoke: 0.05, vanish: 0.75 },
            { type: "ray", ticks: 30, light: 0.1, vanish: 0.75 },
            { type: "strike", ticks: 30, growth: 1, flash: true, numParticles: 5 },
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
    cooldown: 9 * TicksPerSecond,
    throttle: true,

    projectile: {
        density: 1,
        restitution: 0,
        radius: 0.003,
        speed: 0.8,
        maxTicks: 4 * TicksPerSecond,
        damage: 30,
        bumpable: true,
        lifeSteal,
        expireOn: Categories.Hero | Categories.Massive,
        expireAgainstHeroes: Alliances.Enemy,
        hitInterval: 15, // So repeated hits to obstacles work
        shieldTakesOwnership: false,

        partialDamage: {
            ticks: 1 * TicksPerSecond,
            initialMultiplier: 0.5,
        },

        behaviours: [
            {
                type: "homing",
                revolutionsPerSecond: 1,
                maxTurnProportion: 0.065,
                minDistanceToTarget: 0.075,
                targetType: HomingTargets.self,
            },
        ],

        color: '#ff00ff',
        sound: "boomerang",
        soundHit: "standard",
        renderers: [
            { type: "bloom", selfColor: true },
            { type: "projectile", selfColor: true, ticks: 10, vanish: 1 },
            { type: "ray", selfColor: true, ticks: 10, vanish: 1 },
            { type: "ray", selfColor: true, radiusMultiplier: 0.25, ticks: 60, vanish: 1 },
            { type: "strike", selfColor: true, ticks: 15, flash: true, numParticles: 5, detonate: 0.006 },
        ],
    },
};
const retractor: Spell = {
    id: 'retractor',
    name: 'Refract',
    description: "Refract can turn corners - hold the button down, then release the button to redirect. After it refracts, damage increases with distance travelled, so take an indirect path to do maximum damage.",
    action: "focus",

    color: '#00ff7f',
    icon: "arcingBolt",

    maxAngleDiffInRevs: 0.01,
    cooldown: 1.5 * TicksPerSecond,
    focusDelaysCooldown: true,
    throttle: true,

    movementProportionWhileChannelling: 0.5,
    release: {},
    releaseAfterTicks: 0,
    releaseBehaviours: [
        {
            type: "homing",
            targetType: "cursor",
            newSpeed: 0.2,
            revolutionsPerSecond: 1,
            redirect: true,
        },
        {
            type: "partial",
            partialDamage: {
                initialMultiplier: 0.5,
                finalMultiplier: 1,
                ticks: 1 * TicksPerSecond,
            },
        },
    ],

    projectile: {
        damage: 30,
        lifeSteal,
        density: 60,
        radius: 0.0035,
        speed: 0.3,
        maxTicks: 2.0 * TicksPerSecond,
        categories: Categories.Projectile,
        shieldTakesOwnership: false,

        partialDamage: {
            initialMultiplier: 0.5,
            finalMultiplier: 0.5,
            ticks: 1,
        },

        detonate: {
            damage: 0,
            lifeSteal,
            radius: 0.015,

            minImpulse: 0,
            maxImpulse: 0,

            renderTicks: 15,
        },

        behaviours: [
            {
                type: "accelerate",
                maxSpeed: 0.4,
                accelerationPerSecond: 0.4,
            },
        ],

        sound: "retractor",
        color: '#00ff7f',
        renderers: [
            { type: "bloom", selfColor: true },
            {
                type: "swirl",
                color: '#00ff7f',
                ticks: 30,
                radius: 0.007,
                particleRadius: 0.001,
                glow: 0.05,
                smoke: 0.3,
                numParticles: 2,
                loopTicks: 15,
                vanish: 1,
                selfColor: true,
            },
            { type: "projectile", ticks: 15, glow: 0.3, selfColor: true },
            { type: "ray", ticks: 15, glow: 0.3, vanish: 0.25, selfColor: true },
            { type: "strike", ticks: 15, flash: true, numParticles: 9, selfColor: true },
        ],
    },
};
const backlash: Spell = {
    id: 'backlash',
    name: 'Boomerang',
    description: "Away and back. Hit your enemy twice, if you can. Cooldown reduced 0.75 seconds if you hit.",
    action: "projectile",

    color: '#00ccff',
    icon: "crackedBallDunk",

    maxAngleDiffInRevs: 0.01,
    cooldown: 2 * TicksPerSecond,
    throttle: true,

    projectile: {
        damage: 20,
        lifeSteal,
        density: 1,
        restitution: 0,
        radius: 0.002,
        speed: 0.66,
        maxTicks: 2 * TicksPerSecond,
        categories: Categories.Projectile,
        sense: Categories.Hero | Categories.Projectile,
        collideWith: Categories.All ^ Categories.Hero ^ Categories.Projectile,
        expireOn: Categories.Hero | Categories.Massive,
        expireAgainstHeroes: Alliances.Self,
        expireAgainstObjects: Alliances.NotFriendly,
        shieldTakesOwnership: false,
        noKnockback: true,
        bumpable: true,

        behaviours: [
            {
                trigger: { afterTicks: 33 },
                type: "homing",
                revolutionsPerSecond: 1,
                targetType: "self",
            },
            {
                trigger: { afterTicks: 33 },
                type: "clearHits",
            },
        ],

        buffs: [
            {
                type: "cooldown",
                owner: true,
                against: Alliances.Enemy,
                spellId: "backlash",
                adjustCooldown: -0.75 * TicksPerSecond,
            },
        ],

        sound: "backlash",
        color: '#00ccff',
        renderers: [
            { type: "bloom", ownerColor: true },
			{ type: "projectile", "ownerColor": true, "ticks": 5, "smoke": 0.5 },
            { type: "polygon", ownerColor: true, numPoints: 3, radiusMultiplier: 3, revolutionInterval: 11, ticks: 1 },
            { type: "ray", ownerColor: true, ticks: 25, vanish: 0.5 },
            { type: "ray", ownerColor: true, ticks: 5, vanish: 1 },
            { type: "strike", color: '#fff', ticks: 25, growth: 1.5, flash: true, speedMultiplier: -0.5, detonate: 0.02 },
        ],
    },
};
const rocket: Spell = {
    id: 'rocket',
    name: 'Spirit Bomb',
    description: "You control Spirit Bomb while it is flying, but while doing this, you cannot move. Cast Spirit Bomb again to detonate at exactly the right moment.",
    effects: [
        {
            icon: "fas fa-hand-paper",
            title: "Interruptible",
            text: "If you take an enemy hit, Spirit Bomb will be interrupted.",
        },
        {
            icon: "fas fa-snowflake",
            title: "Freeze",
            text: "Enemies hit will be unable to move for a short time.",
        },
    ],
    action: "focus",

    color: '#ff8855',
    icon: "mightyForce",

    maxAngleDiffInRevs: 0.01,
    cooldown: 5 * TicksPerSecond,
    focusDelaysCooldown: false,
    throttle: true,

    interruptibleAfterTicks: 0,
    movementProportionWhileChannelling: 0.05,
    strikeCancel: {},

    projectile: {
        damage: 0,
        density: 1,
        radius: 0.005,
        speed: 0.22,
        maxTicks: 2.25 * TicksPerSecond,
        collideWith: Categories.All,
        expireOn: Categories.All ^ Categories.Shield,
        shieldTakesOwnership: false,

        partialDetonateRadius: {
            initialMultiplier: 0.5,
            ticks: 1 * TicksPerSecond,
        },

        detonate: {
            damage: 0,
            radius: 0.028,
            minImpulse: 0.0006,
            maxImpulse: 0.0008,
            renderTicks: 10,

            buffs: [
                {
                    type: "movement",
                    maxTicks: 1.5 * TicksPerSecond,
                    movementProportion: 0.1,
                    render: {
                        color: "rgba(64, 255, 255, 1)",
                        alpha: 0.3,
                        ticks: 15,
                        emissionRadiusFactor: 1,
                        particleRadius: 0.01,
                        shine: 0.2,
                        glow: 0.7,
                        bloom: 0.03,
                        vanish: 1,
                    },
                }
            ],
        },

        partialBuffDuration: {
            initialMultiplier: 0.33,
            ticks: 1 * TicksPerSecond,
        },

        behaviours: [
            {
                type: "homing",
                targetType: "follow",
                revolutionsPerSecond: 0.006,
            },
            { type: "expireOnChannellingEnd" },
        ],

        sound: "rocket",
        color: '#ff9a00',
        renderers: [
            { type: "bloom", ownerColor: true, radius: 0.028, glow: 0.4 },
            { type: "reticule", color: 'rgba(255, 255, 255, 0.1)', radius: 0.028, minRadius: 0.024, usePartialDamageMultiplier: true },
            { type: "projectile", ticks: 5, glow: 0.3, smoke: 0.5, ownerColor: true },
            { type: "strike", ticks: 20, flash: true, ownerColor: true, numParticles: 9 },
        ],
    },
};


const whip: Spell = {
    id: 'whip',
    name: 'Electroshock',
    description: "Shock your enemies at short-range. Electroshock lifesteals from your enemy.",
    effects: [
        {
            icon: "fas fa-running",
            title: "Fast",
            text: "Gain a 20% movement speed bonus for 3 seconds (even if you miss).",
        },
    ],
    action: "projectile",

    color: '#39fffa',
    icon: "electricWhip",

    maxAngleDiffInRevs: 0.01,
    chargeTicks: 5,
    cooldown: 1.5 * TicksPerSecond,
    throttle: true,

    buffs: [
        {
            type: "movement",
            stack: "whip",
            maxTicks: 3 * TicksPerSecond,
            movementProportion: 1.2,
            render: {
                color: "#8800ff",
				"alpha": 0.2,
                heroColor: true,
                ticks: 30,
                emissionRadiusFactor: 0,
                particleRadius: Hero.Radius,
                shine: 0.5,
                glow: 1,
                bloom: 0.03,
                vanish: 1,
                decay: true,
            },
        },
    ],

    projectile: {
        density: 2,
        radius: 0.001,
        speed: 2,
        maxTicks: 1,
        damage: 0,
        categories: Categories.Projectile,
        collideWith: Categories.Obstacle | Categories.Shield | Categories.Massive,
        expireOn: Categories.None,
        swappable: false,
        shieldTakesOwnership: false,

        detonate: {
            damage: 32,
            lifeSteal: 1,
            radius: 0.0125,
            minImpulse: 0.0002,
            maxImpulse: 0.0002,
            renderTicks: 10,
        },

        behaviours: [
            { type: "strafe" },
        ],

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
                smoke: 0.01,
                vanish: 1,
                glow: 0.05,
            },
            { type: "link", color: '#fffcb1', width: Pixel * 2.5, toWidth: Pixel * 5, glow: 0.3 },
            { type: "strike", ticks: 30, flash: true, numParticles: 7 },
        ],
    },
};

const link: Spell = {
    id: 'link',
    description: "Pull your enemy towards you.",
    effects: [
        {
            icon: "fas fa-exchange",
            title: "Redirect",
            text: "While linked, all received damage is instead applied to your enemy.",
        }
    ],
    action: "projectile",

    color: '#0000ff',
    icon: "andromedaChain",

    maxAngleDiffInRevs: 0.01,
    cooldown: 7.5 * TicksPerSecond,
    throttle: false,

    projectile: {
        density: 1,
        radius: 0.005,
        speed: 0.5,
        restitution: 0,
        maxTicks: 90, // Just enough so it doesn't knockback self
        damage: 0,
        collideWith: Categories.Hero | Categories.Obstacle | Categories.Shield | Categories.Massive,
        expireOn: Categories.Hero | Categories.Massive,
        shieldTakesOwnership: false,
        bumpable: true,

        link: {
            linkWith: Categories.Hero,
            impulsePerTick: 0.000006,
            selfFactor: 0,
            targetFactor: 1,
            minDistance: 0.025,
            maxDistance: 0.1,
            linkTicks: 1.75 * TicksPerSecond,

            redirectDamage: {
                selfProportion: 0,
                redirectProportion: 1,
                redirectAfterTicks: 15,
            },

            render: {
                type: "link",
                color: '#4444ff',
                width: 1.5 * Pixel,
                toWidth: 3 * Pixel,
                "glow": 0.4,
                "bloom": 0.005,
                shine: 0.25,
                light: true,

                strike: {
                    ticks: 15,
                    flash: true,
                    growth: 2,
                },
            },
        },

        detonate: {
            damage: 0,
            lifeSteal,
            radius: 0.01,
            minImpulse: 0.0001,
            maxImpulse: 0.0001,
            renderTicks: 0,
        },

        behaviours: [
            { type: "strafe" },
            {
                type: "homing",
                trigger: { afterTicks: 40 },
                targetType: HomingTargets.self,
                newSpeed: 0.05,
                redirect: true,
            },
            {
                type: "homing",
                trigger: { afterTicks: 60 },
                targetType: HomingTargets.self,
                newSpeed: 0.6,
                redirect: true,
            },
            {
                type: "expireOnOwnerDeath",
            },
        ],

        sound: "link",
        color: '#4444ff',
        renderers: [
            { type: "bloom", radius: 0.05 },
            { type: "polygon", color: '#4444ff', numPoints: 3, radiusMultiplier: 2, revolutionInterval: 23, ticks: 1, light: 1 },
            {
                type: "link",
                color: '#4444ff',
                width: 1.5 * Pixel,
                toWidth: 3 * Pixel,
                "glow": 0.4,
                "bloom": 0.005,
                shine: 0.25,
                light: true,
            },
        ],
    },
};
const grapple: Spell = {
    id: 'grapple',
    description: "Hold the button to grapple. Move your cursor to swing Grapple around. Throw your enemies into the void!",
    action: "focus",

    color: '#f02',
    icon: "grapple",

    maxAngleDiffInRevs: 0.01,
    cooldown: 5 * TicksPerSecond,
    throttle: false,
    unlink: true,

    release: {},
    maxChannellingTicks: 2 * TicksPerSecond, // projectile time + link time
    movementProportionWhileChannelling: 1,

    projectile: {
        density: 1,
        radius: 0.0025,
        speed: 0.7,
        maxTicks: 20,
        damage: 0,
        collideWith: Categories.All ^ Categories.Projectile,
        expireOn: Categories.Hero | Categories.Obstacle | Categories.Massive,
        expireOnMirror: true,
        shieldTakesOwnership: false,

        link: {
            linkWith: Categories.Hero | Categories.Obstacle | Categories.Massive,
            selfFactor: 1,
            targetFactor: 0.25,
            impulsePerTick: 0.00002,
            sidewaysImpulsePerTick: 0.00002,
            massInvariant: true,
            minDistance: 0.025,
            maxDistance: 0.075,
            linkTicks: 1 * TicksPerSecond,
            channelling: true,

            render: {
                type: "link",
                color: '#f02',
                width: 1.5 * Pixel,
                toWidth: 3 * Pixel,
                "glow": 0.3,
                "bloom": 0.01,
                shine: 0.25,
                light: true,
            },
        },

        buffs: [
            {
                collideWith: Categories.All,
                owner: true,
                type: "glide",
                maxTicks: 1 * TicksPerSecond,
                linkOwner: true,
                linearDampingMultiplier: 10,
            },
            {
                collideWith: Categories.Hero,
                type: "glide",
                maxTicks: 1 * TicksPerSecond,
                linkVictim: true,
                linearDampingMultiplier: 0.9,
            },
        ],

        behaviours: [
            { type: "expireOnOwnerDeath" },
            { type: "expireOnChannellingEnd" },
        ],

        sound: "grapple",
        color: '#f02',
        renderers: [
            { type: "bloom", radius: 0.05 },
            { type: "polygon", color: '#f02', numPoints: 3, radiusMultiplier: 4, revolutionInterval: 31, ticks: 1, light: 1 },
            {
                type: "link",
                color: '#f02',
                width: 1 * Pixel,
                toWidth: 5 * Pixel,
                "glow": 0.3,
                "bloom": 0.01,
                shine: 0.25,
                light: true,
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
        density: 3,
        radius: 0.001,
        speed: 1.5,
        fixedSpeed: true,
        bumpable: true,
        maxTicks: 3.0 * TicksPerSecond,
        hitInterval: 15,
        damage: 10,
        lifeSteal,
        collideWith: Categories.Hero | Categories.Shield | Categories.Massive | Categories.Obstacle,
        expireOn: Categories.Massive,
        shieldTakesOwnership: false,
        bounce: {
            cleanseable: true,
        },

        sound: "bouncer",
        color: '#88ee22',
        renderers: [
            { type: "bloom", selfColor: true },
            { type: "ray", intermediatePoints: true, selfColor: true, ticks: 60, vanish: 0.25 },
            { type: "strike", selfColor: true, ticks: 15, flash: true, growth: 1 },
        ],
    },
};
const repeater: Spell = {
    id: 'repeater',
    description: "Every time Repeater hits, the cooldown resets and you can shoot it again immediately. Hitting the same enemy again will do 150% damage, and the third time it will do 200% damage (the maximum). Repeater takes 0.4 seconds to grow to full damage, so hit from a distance for maximum effect.",
    action: "projectile",

    color: '#00ff00',
    icon: "sonicLightning",

    maxAngleDiffInRevs: 0.01,
    cooldown: 10 * TicksPerSecond,
    chargeTicks: 3,
    throttle: true,

    projectile: {
        density: 10,
        radius: 0.002,
        speed: 0.8,
        maxTicks: 1 * TicksPerSecond,
        damage: 15,
        source: "repeater",
        lifeSteal,
        collideWith: Categories.All ^ Categories.Projectile,
        expireOn: Categories.All ^ Categories.Shield,

        partialDamage: {
            initialMultiplier: 0.1,
            ticks: 0.4 * TicksPerSecond,
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
            {
                type: "armor",
                maxTicks: 5 * TicksPerSecond,
                against: Alliances.Enemy,
                proportion: 0.5,
                stack: "repeater",
                source: "repeater",
                maxStacks: 2,
                resetOnGameStart: true,

                render: {
                    "color": "#0f0",
                    "alpha": 1,
                    "ticks": 1,
                    "emissionRadiusFactor": 0,
                    "particleRadius": 0,
                    "shine": 0.2,
                    "glow": 0.4,
                    "bloom": 0.02,
                    "bloomLow": 0.02,
                    "decay": true,
                    light: 0.5,
                },
            },
        ],

        sound: "repeater",
        color: '#00ff00',
        renderers: [
            { type: "bloom" },
            { type: "projectile", ticks: 18, noPartialRadius: true },
            { type: "ray", intermediatePoints: true, ticks: 12, glow: 0.3, radiusMultiplier: 0.25 },
            { type: "strike", ticks: 18, flash: true, growth: 1, numParticles: 5 },
        ],
    },
};
const drain: Spell = {
    id: 'drain',
    description: "Steal some life from your enemy. They probably didn't need it anyway.",
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
        damage: 15,
        lifeSteal: 1,

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
            { type: "bloom" },
            { type: "projectile", ticks: 5, vanish: 1, light: 0.5 },
            { type: "projectile", ticks: 15, vanish: 1, light: 0.3 },
            { type: "ray", intermediatePoints: true, radiusMultiplier: 0.25, ticks: 45, vanish: 1, light: 0.5 },
            { type: "strike", ticks: 30, growth: 2, flash: true, numParticles: 4 },
        ],
    },
};

const renderGravity: RenderSwirl = {
    type: "swirl",

    color: '#0ace00cc',
    radius: 0.02,
    ticks: 0.25 * TicksPerSecond,

    loopTicks: 20,

    numParticles: 3,
    particleRadius: 0.02 / 3,

    glow: 0.4,
    shine: 0.4,
    vanish: 0.5,
    bloom: 0.04,

    smoke: {
        axisMultiplier: 0.3,
        isotropicSpeed: 0.07,
    },
};
const gravity: Spell = {
    id: 'gravity',
    name: 'Ensnare',
    description: "Hold an enemy in place while you unleash your volleys upon them.",
    effects: [
        {
            icon: "fas fa-hourglass-half",
            title: "Silence",
            text: "Your enemy will be unable to cast spells for 0.75 seconds.",
        },
        {
            icon: "fas fa-clock",
            title: "Recharge",
            text: "If it hits, reduces cooldowns for all your spells except Ensnare by 4 seconds.",
        },
    ],
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
        ccd: false,
        attractable: false,
        radius: 0.0125,
        speed: 0.45,
        maxTicks: 5.0 * TicksPerSecond,
        damage: 0,
        noHit: true,
        collideWith: Categories.Hero | Categories.Massive,
        sensor: true,

        gravity: {
            impulsePerTick: 0.001 / TicksPerSecond,
            ticks: 2 * TicksPerSecond,
            radius: 0.045,
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
            {
                type: "cooldown",
                against: Alliances.NotFriendly,
                owner: true,
                maxTicks: 1,
                adjustCooldown: -4 * TicksPerSecond,
                notSpellIds: ["gravity"],
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
    description: "A freezing whirlwind to slow your enemies. The whirlwind also catches enemy projectiles.",
    effects: [
        {
            icon: "fas fa-snowflake",
            title: "Slow",
            text: "Enemies caught in your freezing breath will be slowed 50% for 2 seconds.",
        }
    ],
    action: "projectile",

    color: '#44ffff',
    icon: "snowflake1",
    sound: "whirlwind",

    maxAngleDiffInRevs: 0.01,
    cooldown: 7.5 * TicksPerSecond,
    throttle: true,
    chargeTicks: 0.1 * TicksPerSecond,

    projectile: {
        categories: Categories.Massive,
        ccd: false,
        density: 0.0001,
        radius: 0.03,
        speed: 0.15,
        maxTicks: 2 * TicksPerSecond,
        damage: 0,
        collideWith: Categories.Hero,
        expireOn: Categories.None,
        swappable: false,
        sensor: true,
        noKnockback: true,

        hitInterval: 15,
        behaviours: [
            {
                type: "attract",
                collideLike: Categories.Massive,
                categories: Categories.Projectile,
                against: Alliances.NotFriendly,
                radius: 0.04,
                accelerationPerTick: 0.1,
                clampSpeed: 0.4,
            },
        ],

        buffs: [
            {
                type: "movement",
                stack: "whirlwind",
                movementProportion: 0.5,
                maxTicks: 2 * TicksPerSecond,
                against: Alliances.NotFriendly,
                render: {
                    color: "rgba(64, 255, 255, 1)",
                    alpha: 0.3,
                    ticks: 15,
                    emissionRadiusFactor: 1,
                    particleRadius: 0.01,
                    shine: 0.2,
                    glow: 0.7,
                    bloom: 0,
                    vanish: 1,
                },
            }
        ],

        sound: "whirlwind",
        color: "#44ffff",
        renderers: [
            { type: "bloom", radius: 0.05, light: 0.5 },
            {
                type: "swirl",

                color: "rgba(64, 255, 255, 0.25)",
                radius: 0.01,
                ticks: 20,

                loopTicks: 13,

                numParticles: 2,
                particleRadius: 0.02,

                light: null,
                glow: 0.7,
                shine: 0.2,
                smoke: 1.3,
                fade: "#144",
                vanish: 1,
            },
            { type: "strike", ticks: 20, flash: true, growth: 0.1 },
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
        ccd: false,
        radius: 0.001,
        speed: 0.3,
        maxTicks: 1.05 * TicksPerSecond,
        damage: 0,
        collideWith: Categories.None,
        expireOn: Categories.None,
        expireAfterCursorTicks: 0.3 * TicksPerSecond,

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
            minImpulse: 0.0004,
            maxImpulse: 0.0010,

            renderTicks: 30,
        },

        sound: "supernova",
        color: '#ff9a00',
        renderers: [
            { type: "bloom", radius: 0.03 },
            { type: "projectile", ticks: 3, vanish: 1 },
            { type: "ray", ticks: 30, vanish: 1 },
            {
                type: "reticule",
                color: '#ff9a00',
                minRadius: 0.049,
                remainingTicks: 0.25 * TicksPerSecond,
                shrinkTicks: 0.25 * TicksPerSecond,
                radius: 0.05,
            },
        ],
    },
};

const halo: Spell = {
    id: 'halo',
    name: 'Halo',
    description: "Build up to 3 halos over 3 seconds, then touch your enemy for lifesteal.",
    effects: [
        {
            icon: "fas fa-running",
            title: "Fast",
            text: "Gain a 20% movement speed boost.",
        },
        {
            icon: "fas fa-hand-paper",
            title: "Interruptible",
            text: "The halos and speed boost will be cancelled if you are hit, or if you cast another spell.",
        },
    ],
    action: "spray",

    color: '#ffaa77',
    icon: "angelOutfit",

    maxAngleDiffInRevs: 0.01,
    cooldown: 7.5 * TicksPerSecond,
    throttle: true,

    movementProportionWhileChannelling: 1,
    interruptibleAfterTicks: 0,

    strikeCancel: {},
    maxChannellingTicks: 5 * TicksPerSecond, // A bit higher than normal so that the movement speed buff can last

    jitterRatio: 0.0,
    intervalTicks: 1.5 * TicksPerSecond,
    lengthTicks: 3 * TicksPerSecond + 1,

    buffs: [
        {
            type: "movement",
            maxTicks: 7.5 * TicksPerSecond,
            movementProportion: 1.2,
            channelling: true,

            render: {
                color: "#8800ff",
				"alpha": 0.2,
                heroColor: true,
                ticks: 30,
                emissionRadiusFactor: 0,
                particleRadius: Hero.Radius,
                shine: 0.5,
                glow: 1,
                vanish: 1,
                decay: true,
            },
        },
    ],


    projectile: {
        density: 1,
        ccd: false,
        radius: 0.002,
        speed: 0.5,
        maxTicks: 4 * TicksPerSecond,
        hitInterval: 15,
        damage: 6,
        lifeSteal: 1,
        collideWith: Categories.Hero | Categories.Shield,
        expireOn: Categories.Massive,
        expireAgainstHeroes: Alliances.NotFriendly,
        expireAgainstObjects: Alliances.NotFriendly,
        swappable: false,
        selfPassthrough: true,
        shieldTakesOwnership: false,
        destructible: {
            against: Alliances.NotFriendly,
        },

        behaviours: [
            {
                type: "strafe",
                maxSpeed: Hero.MoveSpeedPerSecond,
            },
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
            { type: "bloom", selfColor: true, ownerColor: true, radius: 0.02 },
            { type: "ray", selfColor: true, ownerColor: true, ticks: 15, glow: 0, vanish: 1 },
            { type: "strike", selfColor: true, ownerColor: true, ticks: 15, growth: 1.1, flash: true, numParticles: 3 },
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
    lengthTicks: 5,

    jitterRatio: 0.7,

    projectile: {
        density: 1,
        ccd: false,
        radius: 0.004,
        speed: 0.5,
        maxTicks: 4.5 * TicksPerSecond,
        minTicks: 1,
        damage: 12,
        lifeSteal,
        hitInterval: 30,
        source: "mines",

        categories: Categories.Projectile,
        collideWith: Categories.Hero | Categories.Obstacle | Categories.Massive, // Passes through shield
        sense: Categories.Projectile,
        expireOn: Categories.All ^ Categories.Shield,
        expireAgainstObjects: Alliances.All ^ Alliances.Self,
        conveyable: true,
        destructible: {
        },
        attractable: {
            ignoreAlliance: true,
        },

        partialDamage: {
            initialMultiplier: 0.001,
            ticks: 7,
            step: true,
        },

        buffs: [
            {
                type: "armor",
                maxTicks: 15,
                maxStacks: 1,
                proportion: -0.5,
                source: "mines",
            }
        ],

        detonate: {
            damage: 0,
            lifeSteal,
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
                maxDistance: 0.15,
                trigger: { afterTicks: 60 },
            },
        ],

        sound: "mines",
        color: '#ff009c',
        renderers: [
            { type: "bloom", selfColor: true, radius: 0.015, light: null },
            { type: "projectile", ticks: 1, light: null, selfColor: true, shine: 0, glow: 0.3, noPartialRadius: true },
            { type: "ray", intermediatePoints: true, ticks: 3, selfColor: true, noPartialRadius: true },
        ],
    },
};

const iceBomb: Spell = {
    id: 'iceBomb',
    name: 'Frostsplatter',
    description: "Shoot a splatter of frost in a wide arc. Pushes away objects and freezes enemies.",
    action: "spray",
    effects: [
        {
            icon: "fas fa-snowflake",
            title: "Freeze",
            text: "Freeze nearby enemies for 1.5 seconds.",
        },
    ],
    sound: "iceBomb",

    color: '#44ffff',
    icon: "frostfire",

    maxAngleDiffInRevs: 0.01,
    cooldown: 5 * TicksPerSecond,
    throttle: true,

    numProjectilesPerTick: 2,
    intervalTicks: 1,
    lengthTicks: 3,

    jitterRatio: 0.6,

    projectile: {
        density: 1,
        sensor: true,
        ccd: false,
        restitution: 0,
        radius: 0.01,
        speed: 0.2,
        maxTicks: 25,
        minTicks: 1,
        damage: 0,
        noKnockback: true,
        swappable: false,
        attractable: false,

        categories: Categories.Projectile,
        collideWith: Categories.Hero | Categories.Shield | Categories.Massive | Categories.Obstacle,
        expireOn: Categories.Massive,

        behaviours: [
            {
                type: "attract",
                collideLike: Categories.Massive,
                categories: Categories.Projectile | Categories.Obstacle | Categories.Massive,
                against: Alliances.NotFriendly,
                radius: 0.02,
                "accelerationPerTick": -0.1,
                "maxSpeed": 0.4
            },
        ],

        buffs: [
            {
                type: "movement",
                stack: "iceBomb",
                maxStacks: 1,
                movementProportion: 0.1,
                maxTicks: 1.25 * TicksPerSecond,
                against: Alliances.NotFriendly,
                render: {
                    color: "rgba(64, 255, 255, 1)",
                    alpha: 0.3,
                    ticks: 15,
                    emissionRadiusFactor: 1,
                    particleRadius: 0.01,
                    shine: 0.2,
                    glow: 0.7,
                    bloom: 0,
                    vanish: 1,
                },
            },
        ],

        shieldTakesOwnership: false,

        sound: "iceBomb",
        color: '#44ffff',
        renderers: [
            { type: "bloom", radius: 0.01 },
            { type: "projectile", ticks: 30, color: "rgba(64, 255, 255, 0.25)", light: null, shine: 0.4, glow: 0.7, smoke: 0.6, vanish: 1 },
            { type: "strike", ticks: 10, flash: true, growth: 0.1 },
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
    cooldown: 6 * TicksPerSecond,
    throttle: true,

    buffs: [
        { // Normally attacks can make your life go negative, which makes it hard to recover from. With Horcrux any lifesteal should save you.
            type: "lifeSteal",
            maxTicks: 2 * TicksPerSecond,
            minHealth: 0,
        },
    ],

    projectile: {
        density: 10,
        restitution: 0,
        radius: 0.0035,
        speed: 0.35,

        maxTicks: 3 * TicksPerSecond,
        minTicks: 1,
        damage: 0,
        lifeSteal: 1,

        collideWith: Categories.Hero | Categories.Obstacle | Categories.Massive | Categories.Shield,
        expireOn: Categories.Hero | Categories.Massive,
        destructible: {},
        conveyable: true,
        bumpable: true,

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
                radius: 0.04,
                tickInterval: 6,
                maxHits: 10,
                packet: { damage: 3, lifeSteal: 1, minHealth: 1, noHit: true, noKnockback: true },
                buffs: [
                    { // Just used for graphics
                        type: "movement",
                        stack: "horcrux",
                        maxTicks: 10,
                        movementProportion: 1,
                        render: {
                            color: "#22ee88",
                            alpha: 0.3,
                            glow: 0.7,
                            ticks: 15,
                            emissionRadiusFactor: 1,
                            particleRadius: 0.5 * Hero.Radius,
                            light: 1,
                        },
                    },
                ]
            },
        ],

        sound: "horcrux",
        color: '#22ee88',
        renderers: [
            { type: "bloom", light: null },
            { type: "reticule", color: 'rgba(0, 0, 0, 0.05)', radius: 0.04, minRadius: 0.036 },
            { type: "reticule", color: 'rgba(34, 238, 136, 0.1)', radius: 0.04, minRadius: 0.0325, shrinkTicks: 13, grow: true, fade: true, repeat: true },
            { type: "polygon", color: 'rgba(34, 238, 136, 0.5)', numPoints: 5, radiusMultiplier: 2.5, revolutionInterval: 60, ticks: 1, shine: 0 },
            { type: "projectile", ticks: 10, glow: 0.3, smoke: 0.3 },
            { type: "strike", ticks: 10, flash: true, growth: 1.25, numParticles: 5 },
            { type: "reticule", color: 'rgba(34, 238, 136, 0.5)', radius: 0.04, minRadius: 0.0325, shrinkTicks: 10, startingTicks: 10 },
            {
                type: "link",
                color: 'rgba(255, 255, 255, 0.1)',
                width: 1 * Pixel,
                toWidth: 2 * Pixel,
                glow: 0.3,
            },
        ],
    },
};

const saber: Spell = {
    id: 'saber',
    name: 'Lightsaber',
    description: "For 1 second, swing your lightsaber to deflect projectiles and knockback enemies!",
    effects: [
        {
            icon: "fas fa-unlink",
            title: "Detach",
            text: "Lightsaber cuts through any Links or Grapples.",
        },
        {
            icon: "fas fa-snowflake",
            title: "Slow",
            text: "Your movement speed is reduced 50% when casting Lightsaber.",
        }
    ],
    untargeted: true,

    unlink: true,
    takesOwnership: true,
    blocksTeleporters: false,
    shiftMultiplier: 0.5,
    speedMultiplier: 2,
    maxSpeed: 0.5,
    maxTurnRatePerTickInRevs: 0.1,
    damageMultiplier: 1,

    angleOffsetsInRevs: [0],
    width: Pixel,
    length: 0.075,

    movementProportionWhileChannelling: 0.5,

    interruptibleAfterTicks: 20,

    cooldown: 10 * TicksPerSecond,
    throttle: false,

    icon: "waveStrike",

    maxTicks: 1 * TicksPerSecond,
    channelling: true,

    categories: Categories.Shield,
    collidesWith: Categories.Hero | Categories.Projectile,

    damageTemplate: { damage: 0 },
    hitBuffs: [
        { type: "delink" },
    ],

    trailTicks: 5,
    color: '#00ccff',
    light: 1,
    shine: 0.1,
    glow: 0.3,
    bloom: 0.03,
    strike: {
        ticks: 6,
        flash: true,
        bloom: 0.03,
    },

    sound: "saber",
    action: "saber",
};

const dualSaber: Spell = {
    id: 'dualSaber',
    name: 'Dualsaber',
    description: "For 1.5 seconds, swing dual lightsabers to deflect projectiles and knockback enemies!",
    effects: [
        {
            icon: "fas fa-unlink",
            title: "Detach",
            text: "Dualsaber cuts through any Links or Grapples.",
        },
    ],
    untargeted: true,

    unlink: true,
    takesOwnership: true,
    blocksTeleporters: false,
    shiftMultiplier: 0.5,
    speedMultiplier: 2,
    maxSpeed: 0.5,
    maxTurnRatePerTickInRevs: 0.1,
    damageMultiplier: 1,

    angleOffsetsInRevs: [-0.25, 0.25],
    width: Pixel,
    length: 0.07,

    movementProportionWhileChannelling: 1,
    interruptibleAfterTicks: 20,

    cooldown: 10 * TicksPerSecond,
    throttle: false,

    icon: "waveStrike",

    maxTicks: 1.5 * TicksPerSecond,
    channelling: true,

    categories: Categories.Shield,
    collidesWith: Categories.Hero | Categories.Projectile,

    damageTemplate: { damage: 0 },
    hitBuffs: [
        { type: "delink" },
    ],

    trailTicks: 5,
    color: '#ff0044',
    light: 1,
    shine: 0.1,
    glow: 0.3,
    bloom: 0.03,
    strike: {
        ticks: 6,
        flash: true,
        bloom: 0.03,
    },

    sound: "saber",
    action: "saber",
};

const scourge: Spell = {
    id: 'scourge',
    name: 'Overload',
    description: "Release a melee-range explosion that will send your enemies flying. Be careful - this spell is so powerful it costs you some health too.",
    untargeted: true,
    movementCancel: true,

    effects: [
        {
            icon: "fas fa-weight-hanging",
            title: "Heavy",
            text: "Knockback reduced 75% while overloading.",
        },
        {
            icon: "fas fa-clock",
            title: "Recharge",
            text: "Each enemy you hit reduces cooldowns for all your spells except Overload by 3 seconds.",
        },
    ],

    chargeBuffs: [
        {
            type: "mass",
            maxTicks: 0.5 * TicksPerSecond,
            channelling: true,
            radius: Hero.Radius,
            density: Hero.Density * 3,
        },
        {
            type: "glide",
            maxTicks: 0.5 * TicksPerSecond,
            channelling: true,
            linearDampingMultiplier: 4,
        },
    ],

    detonate: {
        damage: 30,
        radius: Hero.Radius * 4,
        minImpulse: 0.001,
        maxImpulse: 0.002,
        renderTicks: 30,

        buffs: [
            {
                type: "cooldown",
                owner: true,
                against: Alliances.Enemy,
                notSpellIds: ["scourge"],
                adjustCooldown: -4 * TicksPerSecond,
            },
        ],
    },
    chargeTicks: 0.5 * TicksPerSecond,
    cooldown: 5 * TicksPerSecond,
    throttle: false,
    unlink: true,

    interruptibleAfterTicks: 0,
    interruptCancel: {
        cooldownTicks: 5 * TicksPerSecond,
    },

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

    maxTicks: 2.0 * TicksPerSecond,
    cooldown: 10 * TicksPerSecond,
    categories: Categories.Shield | Categories.Obstacle,
    throttle: false,
    minRadius: 0.015,
    strokeRadius: 0.024,
    radius: 0.025,
    growthTicks: 9,
    angularWidthInRevs: 0.45,
    maxTurnRatePerTickInRevs: 0.05,
    takesOwnership: true,
    blocksTeleporters: false,
    damageMultiplier: 1,

    buffs: [
        {
            type: "movement",
            maxTicks: 1.5 * TicksPerSecond,
            movementProportion: 0.25,
            decay: true,
        },
    ],

    icon: "shieldReflect",

    color: '#3366ff',

    light: 1,
    glow: 0.3,
    bloom: 0.03,
    shine: 0.1,
    strike: {
        ticks: 10,
        flash: true,
        growth: 0.3,
        bloom: 0.03,
    },

    action: "shield",
    sound: "shield",
};
const phaseOut: Spell = {
    id: 'phaseOut',
    name: 'Phase Shift',
    description: "Hold down the button to disappear from the world for up to 0.75 seconds. While phased shifted, you cannot be hurt, but you also cannot cast spells. Phase shift also cancels all knockback. Phase shift takes longer to cooldown the longer you stay in phase shift.",

    untargeted: true,
    maxAngleDiffInRevs: 1.0,
    cooldown: 5 * TicksPerSecond,
    throttle: false,
    unlink: true,

    interruptibleAfterTicks: 6,
    maxChannellingTicks: 0.75 * TicksPerSecond,
    release: {
        interrupt: true,
        interruptibleAfterTicks: 0.25 * TicksPerSecond,
    },

    buffs: [
        {
            type: "cooldown",
            channelling: true,
            cleansable: false,
            maxTicks: 1 * TicksPerSecond,
            spellId: "phaseOut",
            cooldownRateModifier: -6,
        },
        {
            type: "mass",
            channelling: true,
            cleansable: false,
            maxTicks: 1 * TicksPerSecond,
            radius: 1 * Hero.Radius,
            density: 1000000,
            restrictCollideWith: 0,
        },
        {
            type: "armor",
            channelling: true,
            cleansable: false,
            maxTicks: 1 * TicksPerSecond,
            proportion: -1, // Full immunity
        },
        {
            type: "movement",
            channelling: true,
            cleansable: false,
            maxTicks: 1 * TicksPerSecond,
            movementProportion: 0,
        },
        {
            type: "glide",
            channelling: true,
            cleansable: false,
            maxTicks: 1 * TicksPerSecond,
            linearDampingMultiplier: 1000,
        },
        {
            type: "vanish",
            channelling: true,
            noTargetingIndicator: true,
            noBuffs: true,
            cleansable: false,
            maxTicks: 1 * TicksPerSecond,
            sound: "phaseOut",
            renderStart: {
                numParticles: 10,
                color: "#111",
                ticks: 15,
                particleRadius: Hero.Radius,
                glow: 0.3,
                shine: 1,
                bloom: 0,
                vanish: 1,
                light: 1,
            },
            renderFinish: {
                numParticles: 10,
                color: "#111",
                ticks: 15,
                particleRadius: Hero.Radius,
                glow: 0.3,
                shine: 1,
                bloom: 0,
                vanish: 1,
                light: 1,
            },
        },
    ],

    icon: "resonance",
    color: '#ff00dd',
    action: "buff",
};
const icewall: Spell = {
    id: 'icewall',
    name: 'Forcefield',
    description: "Create a wall that blocks projectiles and acolytes. You can pass through your own forcefield, but other acolytes cannot, even if they are using teleport.",

    maxRange: 0.25,
    movementProportionWhileCharging: 1.0,
    maxTicks: 1.5 * TicksPerSecond,
    growthTicks: 5,
    cooldown: 7.5 * TicksPerSecond,
    throttle: false,
    takesOwnership: false,
    blocksTeleporters: true,
    damageMultiplier: 1,

    length: 0.005,
    width: 0.15,
    density: 100,
    linearDamping: 6,
    angularDamping: 100,

    categories: Categories.Shield | Categories.Obstacle,
    collideWith: Categories.Hero | Categories.Projectile | Categories.Obstacle,
    conveyable: false,
    bumpable: false,
    swappable: true,
    selfPassthrough: true,

    icon: "woodenFence",

    color: '#0088ff',

    light: 1,
    glow: 0.3,
    bloom: 0.03,
    shine: 0.3,
    strike: {
        ticks: 10,
        flash: true,
        growth: 0.05,
        bloom: 0.03,
    },

    action: "wall",
    sound: "icewall",
};
const teleport: Spell = {
    id: 'teleport',
    description: "Teleport to a nearby location. Get close, or get away.",

    effects: [
        {
            icon: "fas fa-heartbeat",
            title: "Weak",
            text: "For 0.25 seconds after teleporting, you will only deal 25% damage and cannot deal fatal damage.",
        },
        cleanse,
        voidRecharge,
    ],

    range: 0.3,
    maxAngleDiffInRevs: 1.0,
    cooldown: 12 * TicksPerSecond,
    throttle: false,
    debuff: true,
    chargeTicks: 6,
    movementProportionWhileCharging: 1.0,

    icon: "teleport",

    color: '#6666ff',

    action: "teleport",
    sound: "teleport",

    buffs: [
        {
            owner: true,
            type: "lifeSteal",
            maxTicks: 0.25 * TicksPerSecond,
            damageMultiplier: 0.25,
            minHealth: 1,
            decay: true,
        },
    ],
};
const thrust: Spell = {
    id: 'thrust',
    name: 'Charge',
    description: "Accelerate quickly, knocking away anything in your path.",
    effects: [
        cleanse,
        voidRecharge,
    ],

    range: 0.4,
    maxAngleDiffInRevs: 0.01,
    cooldown: 10 * TicksPerSecond,
    throttle: false,
    debuff: true,

    damageTemplate: {
        damage: 0,
    },
    speed: 1.5,

    icon: "fireDash",
    color: '#ff00cc',
    action: "thrust",
    sound: "thrust",

    buffs: [
        {
            type: "mass",
            radius: 1.5 * Hero.Radius,
            density: 10,
            maxTicks: 16,
            appendCollideWith: Categories.Shield,
            render: {
                color: "#fff",
                heroColor: true,
                ticks: 8,
                emissionRadiusFactor: 0,
                particleRadius: Hero.Radius * 1.5,
                glow: 0.7,
                shine: 1,
                bloom: 0.07,
                light: 1,
                decay: true,
            },
        }
    ],
};
const blaze: Spell = {
    id: 'blaze',
    name: 'Blaze',
    description: "Dash a short distance, phasing through obstacles and burning through anyone in your path.",

    untargeted: true,
    cooldown: 10 * TicksPerSecond,
    throttle: false,

    icon: "fireWave",
    color: '#ff00cc',
    action: "thrust",
    sound: "blaze",

    range: 0.09,
    speed: 0.8,
    followCursor: true,
    damageTemplate: {
        damage: 10,
        lifeSteal,
    },
    buffs: [
        {
            type: "mass",
            cleansable: false,
            channelling: true,
            maxTicks: 1 * TicksPerSecond, // Limited by channelling
            radius: 0.005, // Radius of the projectile
            restrictCollideWith: Categories.Shield,
            appendCollideWith: Categories.Shield, // Heroes don't normally collide with shields
            sense: Categories.Hero | Categories.Projectile,
            render: {
				"color": "#f0c",
				"selfColor": true,
				"numParticles": 0,
				"particleRadius": 0,
				"ticks": 1,
                "bloom": 0.03,
                glow: 0.5,
				"decay": true
            },
        },
    ],

    projectileInterval: 1,
    projectile: {
        density: 1,
        ccd: false,
        collideWith: Categories.Hero | Categories.Shield,
        expireOn: Categories.All,
        expireOnMirror: true,
        sensor: true,
        swappable: false,
        selfPassthrough: true,
        radius: 0.005,
        speed: 0.1,
        maxTicks: 10,
        damage: 0,
        destructible: {},
        lifeSteal,

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
                maxDistance: 0.15,
                trigger: { afterTicks: 60 },
            },
        ],

        color: '#ff0044',
        renderers: [
            { type: "bloom", ownerColor: true, radius: 0.015 },
            { type: "projectile", ticks: 10, radiusMultiplier: 0.5, smoke: { isotropicSpeed: 0.15 }, vanish: 1, ownerColor: true },
            { type: "strike", ticks: 30, flash: true, detonate: 0.01 },
        ],
    },
};
const swap: Spell = {
    id: 'swap',
    name: 'Swap',
    description: "Swap positions with an enemy, obstacle or meteor. Teleports if you miss.",
    effects: [
        cleanse,
        voidRecharge,
    ],
    action: "projectile",

    color: '#23e3ff',
    icon: "bodySwapping",

    maxAngleDiffInRevs: 0.01,
    cooldown: 10 * TicksPerSecond,
    throttle: false,
    debuff: true,

    projectile: {
        density: 0.001,
        radius: 0.01,
        speed: 0.8,
        maxTicks: 0.75 * TicksPerSecond,
        damage: 0,
        categories: Categories.Projectile,
        collideWith: Categories.Hero | Categories.Obstacle | Categories.Massive | Categories.Shield,
        expireOn: Categories.All, // Expire on a shield, don't bounce off it
        expireOnMirror: true,
        expireAfterCursorTicks: 0,
        swappable: false,
        shieldTakesOwnership: false,
        sensor: true,

        detonate: {
            damage: 0,
            lifeSteal,
            radius: 0.04,

            minImpulse: 0,
            maxImpulse: 0,

            swapWith: Categories.Hero | Categories.Obstacle | Categories.Massive | Categories.Shield,

            renderTicks: 15,
        },

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
            { type: "bloom" },
            {
                type: "swirl",
                color: '#75e7ff',
                ticks: 30,
                radius: 0.01,
                particleRadius: 0.001,
                smoke: 0.05,
                numParticles: 2,
                vanish: 1,
                loopTicks: 15,
                glow: 0.05,
            },
            { type: "projectile", ticks: 1, radiusMultiplier: 0.5, light: 1 },
            { type: "link", color: '#75e7ff', width: 0.001, toWidth: 0.01, glow: 0.3, light: true },
            { type: "strike", color: '#75e7ff', flash: true, ticks: 15, numParticles: 9 },
        ],
    },
};
const voidRush: Spell = {
    id: 'voidRush',
    name: 'Void Rush',
    description: "For 2.5 seconds, increase movement speed 80%, and also become immune to damage from the void.",
    effects: [
        cleanse,
        voidRecharge,
    ],

    untargeted: true,
    maxAngleDiffInRevs: 1.0,
    cooldown: 10 * TicksPerSecond,
    throttle: false,
    debuff: true,

    buffs: [
        {
            type: "movement",
            movementProportion: 1.8,
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
				"alpha": 0.3,
				"light": 1,
                glow: 0.7,
                shine: 0.5,
                bloom: 0.03,
                vanish: 1,
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
    description: "Vanish from sight for 2.5 seconds, and also increase movement speed 80%.",
    effects: [
        cleanse,
        voidRecharge,
    ],

    untargeted: true,
    maxAngleDiffInRevs: 1.0,
    cooldown: 10 * TicksPerSecond,
    throttle: false,
    unlink: true,
    debuff: true,
    movementProportionWhileChannelling: 1.8,
    interruptibleAfterTicks: 15,
    maxChannellingTicks: 2.5 * TicksPerSecond,

    buffs: [
        {
            type: "vanish",
            maxTicks: 2.5 * TicksPerSecond,
            channelling: true,
            cancelOnBump: true,
            sound: "vanish",

            renderStart: {
                numParticles: 10,
                color: "#111",
                ticks: 60,
                particleRadius: Hero.Radius,
                glow: 0.3,
                shine: 0,
                bloom: 0,
                vanish: 1,
            },
            render: {
                invisible: true,
                color: "#181818",
                ticks: 60,
                particleRadius: Hero.Radius,
                glow: 0.3,
                shine: 0,
                bloom: 0,
                vanish: 1,
            },
            renderFinish: {
                numParticles: 10,
                color: "#111",
                ticks: 60,
                particleRadius: Hero.Radius,
                glow: 0.3,
                shine: 0,
                bloom: 0,
                vanish: 1,
            },
        },
    ],

    icon: "hidden",
    color: '#00aaff',
    action: "buff",
};

const armor: Spell = {
    id: 'armor',
    name: 'Spirit Armor',
    description: "Passive ability. Every atom in your body is imbued with inner strength.",
    effects: [
        {
            icon: "fas fa-shield",
            title: "Resistant",
            text: "Reduce damage received by 15%. Applies to all forms of damage, including void damage.",
        },
    ],

    passive: true,
    untargeted: true,
    cooldown: 1,

    buffs: [
        {
            type: "armor",
            passive: true,
            proportion: -0.15,
        },
    ],

    icon: "wingedShield",
    color: '#8800ff',
    action: "buff",
};

const boost: Spell = {
    id: 'boost',
    name: 'Arcane Agility',
    description: "Passive ability. Dodge even more effectively using your knowledge of the arcane.",
    effects: [
        {
            icon: "fas fa-running",
            title: "Fast",
            text: "Increase movement speed by 10%.",
        },
    ],

    passive: true,
    untargeted: true,
    cooldown: 1,

    buffs: [
        {
            type: "movement",
            passive: true,
            movementProportion: 1.1,
        },
    ],

    icon: "dodging",
    color: '#6f0',
    action: "buff",
};

const empower: Spell = {
    id: 'empower',
    name: 'Apex Acolyte',
    description: "Passive ability. Your superior talents allow you to attack with increased effectiveness.",
    effects: [
        {
            icon: "fas fa-sword",
            title: "Empowered",
            text: "Increase damage dealt by 15%.",
        },
    ],

    passive: true,
    untargeted: true,
    cooldown: 1,

    buffs: [
        {
            type: "lifeSteal",
            passive: true,
            damageMultiplier: 1.15,
        },
    ],

    icon: "dna1",
    color: '#40f',
    action: "buff",
};

const bump: Spell = {
    id: 'bump',
    name: 'Reverberate',
    description: "Passive ability. Reverberate sonic waves throughout your body. Knockback anyone you touch.",

    passive: true,
    untargeted: true,
    cooldown: 1,

    buffs: [
        {
            type: "bump",
            passive: true,
            hitInterval: 15,
            impulse: 0.00019,
        },
    ],

    icon: "aura",
    color: '#f40',
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
    blast,
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
    phaseOut,
    supernova,
    halo,
    mines,
    iceBomb,
    teleport,
    thrust,
    blaze,
    swap,
    voidRush,
    vanish,
    armor,
    empower,
    boost,
    bump,
};

export const Mod: ModSettings = {
    name: null,
    author: null,
    description: null,

    titleLeft: "Acolyte",
    titleRight: "Fight!",

    subtitleLeft: "SKILLSHOT",
    subtitleRight: "ARENA",
};

export const DefaultSettings: AcolyteFightSettings = {
    Mod,
    Matchmaking,
    World,
    Hero,
    Obstacle,
    ObstacleTemplates,
    Choices,
    Spells,
    Layouts,
    Sounds,
    Visuals,
    Icons,
    Code,
};