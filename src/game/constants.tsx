import pl from 'planck-js';
import * as c from './world.model';

export const TicksPerSecond = 60;
export const TicksPerTurn = 2;
export const MaxIdleTicks = 30 * TicksPerSecond;
export const Pixel = 0.001;

export namespace Categories {
	export const All = 0xFFFF;
	export const Hero = 0x1;
	export const Projectile = 0x2;
	export const Massive = 0x4;
	export const Obstacle = 0x8;
	export const Shield = 0x10;
	export const None = 0;
}

export namespace Matchmaking {
	export const JoinPeriod = 3 * TicksPerSecond;
	export const MaxHistoryLength = 15 * 60 * TicksPerSecond;
	export const MaxPlayers = 5;
}

export namespace Hero {
	export const MoveSpeedPerTick = 0.1 / TicksPerSecond;
	export const Radius = 0.015;
	export const Density = 0.5;

	export const AngularDamping = 1;
	export const Damping = 3;

	export const AdditionalDamageMultiplier = 2.0;
	export const AdditionalDamagePower = 1.0;

	export const MaxHealth = 100;
	export const SeparationStrength = 0.01;

	export const TurnRate = 0.05 * 2 * Math.PI;

	export const MyHeroColor = '#00ccff';
	export const InactiveColor = '#666666';
	export const Colors = [
		"#6d89cc",
		"#d0c16b",
		"#cb8fc1",
		"#56b5bf",
		"#7db37d",
		"#bfad8f",
		"#a69a7c",
		"#557e6c",
		"#a18e4c",
		"#41569e",
		"#9d6d95",
		"#2bafca",
	];
};

export namespace World {
	export const InitialRadius = 0.4;
	export const HeroLayoutRadius = 0.25;

	export const LavaDamagePerTick = 0.25;
	export const ShrinkPerTick = 0.000075;
	export const InitialShieldTicks = 1.0 * TicksPerSecond;

	export const Layouts: c.Layout[] = [
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
					numPoints: 12,
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
}

export namespace Obstacle {
	export const Health = 100;
	export const AngularDamping = 1;
	export const LinearDamping = 10;
}

export namespace HealthBar {
	export const Radius = Hero.Radius * 0.9;
	export const Height = Pixel * 3;
	export const Margin = Pixel * 2;
}
export namespace ChargingIndicator {
	export const Margin = Pixel * 5;
	export const Width = Pixel * 2;
}
export namespace ButtonBar {
	export const Spacing = 8;
	export const Margin = 5;
	export const Size = 64;
	export const Gap = 32;
	export const Keys = [
		"a", "s",
		null,
		"q", "w", "e", "r",
		null,
		"d", "f",
	];
}

export namespace Spells {
	export const move = {
		id: 'move',
		description: "",
		maxAngleDiff: 0.25 * 2 * Math.PI,
		interruptible: true,
		cooldown: 0,
		action: "move",
	} as c.MoveSpell;

	export const fireball = {
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
		} as c.ProjectileTemplate,
	} as c.ProjectileSpell;

	export const flamestrike = {
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
		} as c.ProjectileTemplate,
	} as c.ProjectileSpell;

	export const firespray = {
		id: 'firespray',
		description: "Shoot a stream of fire in a wide arc. Get closer to focus all your damage onto one target.",
		action: "spray",

		color: '#ff0044',
		icon: "bubblingBeam",

		maxAngleDiff: 0.01 * 2 * Math.PI,
		cooldown: 10 * TicksPerSecond,
		chargeTicks: 0.1 * TicksPerSecond,

		intervalTicks: 0.025 * TicksPerSecond,
		lengthTicks: 0.5 * TicksPerSecond,

		jitterRatio: 0.25,

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
		} as c.ProjectileTemplate,
	} as c.SpraySpell;

	export const meteor = {
		id: 'meteor',
		description: "Send a giant meteor towards your enemies! Nothing stops a meteor.",
		action: "projectile",

		color: '#ff0000',
		icon: "cometSpark",

		maxAngleDiff: 0.01 * 2 * Math.PI,
		cooldown: 12 * TicksPerSecond,

		projectile: {
			color: '#ff0000',

			density: 1000,
			radius: 0.03,
			speed: 0.2,
			maxSpeed: 0.4,
			maxTicks: 12 * TicksPerSecond,
			damage: 1,
			trailTicks: 15,
			categories: Categories.Projectile | Categories.Massive,
			explodeOn: Categories.Obstacle,

			render: "ball",
		} as c.ProjectileTemplate,
	} as c.ProjectileSpell;

	export const kamehameha = {
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
		} as c.ProjectileTemplate,
	} as c.SpraySpell;

	export const lightning = {
		id: 'lightning',
		name: 'Zap',
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
			damage: 1,
			explodeOn: Categories.All,

			render: "ray",
			trailTicks: 30,
		} as c.ProjectileTemplate,
	} as c.ProjectileSpell;

	export const homing = {
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
			} as c.HomingParametersTemplate,

			trailTicks: 30,

			render: "projectile",
		} as c.ProjectileTemplate,
	} as c.ProjectileSpell;

	export const boomerang = {
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

			density: 10,
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
				targetType: c.HomingTargets.self,
			} as c.HomingParameters,

			trailTicks: 1 * TicksPerSecond,

			render: "projectile",
		} as c.ProjectileTemplate,
	} as c.ProjectileSpell;

	export const link = {
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
			damage: 1,
			explodeOn: Categories.Hero,
			shieldTakesOwnership: false,

			link: {
				strength: 1.0 / TicksPerSecond,
				linkTicks: 2.0 * TicksPerSecond,
				lifeSteal: 0.5,
			} as c.LinkParameters,

			homing: {
				turnRate: 2 * Math.PI,
				afterTicks: 1.0 * TicksPerSecond,
				targetType: c.HomingTargets.self,
			} as c.HomingParametersTemplate,

			trailTicks: 1,

			render: "link",
		} as c.ProjectileTemplate,
	} as c.ProjectileSpell;

	export const bouncer = {
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
		} as c.ProjectileTemplate,
	} as c.ProjectileSpell;

	export const drain = {
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
		} as c.ProjectileTemplate,
	} as c.ProjectileSpell;

	export const gravity = {
		id: 'gravity',
		name: 'Trap',
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
			} as c.GravityParameters,

			homing: {
				turnRate: 2 * Math.PI,
				targetType: c.HomingTargets.cursor,
				minDistanceToTarget: Hero.Radius / 2,
				speedWhenClose: 0,
			} as c.HomingParameters,

			render: "gravity",
			trailTicks: 0.25 * TicksPerSecond,
		} as c.ProjectileTemplate,
	} as c.ProjectileSpell;

	export const supernova = {
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
			damage: 1,
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
		} as c.ProjectileTemplate,
	} as c.ProjectileSpell;

	export const scourge = {
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
	} as c.ScourgeSpell;

	export const shield = {
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
	} as c.ShieldSpell;

	export const icewall = {
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
	} as c.WallSpell;

	export const teleport = {
		id: 'teleport',
		name: 'Blink',
		description: "Teleport to a nearby location. Get close, or get away.",

		maxRange: 0.4,
		cooldown: 10 * TicksPerSecond,

		icon: "teleport",

		color: '#6666ff',

		action: "teleport",
	} as c.TeleportSpell;

	export const thrust = {
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
	} as c.ThrustSpell;

	export const all: c.Spells = {
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
};

export namespace Choices {
	export const Options = {
		"a": ["teleport", "thrust"],
		"s": ["shield", "icewall", "drain"],
		"q": ["fireball", "flamestrike"],
		"w": ["lightning", "link"],
		"e": ["homing", "boomerang", "gravity"],
		"r": ["meteor", "kamehameha", "supernova"],
		"d": ["bouncer", "firespray"],
		"f": ["scourge"],
	} as c.KeyBindingOptions;

	export const Defaults = {
		"a": "teleport",
		"s": "shield",
		"q": "fireball",
		"w": "lightning",
		"e": "homing",
		"r": "meteor",
		"d": "bouncer",
		"f": "scourge",
	} as c.KeyBindings;
}