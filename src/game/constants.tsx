import pl from 'planck-js';
import * as c from './world.model';

export const TicksPerSecond = 60;
export const Pixel = 0.001;

export namespace Categories {
	export const All = 0xFFFF;
	export const Hero = 1;
	export const Projectile = 2;
	export const None = 0;
}

export namespace Matchmaking {
	export const JoinPeriod = 3 * TicksPerSecond;
	export const MaxHistoryLength = 3 * 60 * TicksPerSecond;
	export const MaxPlayers = 5;
}

export namespace Hero {
	export const MoveSpeedPerTick = 0.1 / TicksPerSecond;
	export const Radius = 0.015;
	export const Density = 0.5;
	export const AngularDamping = 1;
	export const MaxDamping = 5;
	export const MinDamping = 1;
	export const MaxHealth = 100;
	export const SeparationStrength = 0.01;

	export const TurnRate = 0.05 * 2 * Math.PI;

	export const MyHeroColor = '#00ccff';
	export const InactiveColor = '#666666';
	export const Colors = [
		"#bfad8f",
		"#7db37d",
		"#d0c16b",
		"#6d89cc",
		"#cb8fc1",
		"#56b5bf",
		"#a69a7c",
		"#557e6c",
		"#a18e4c",
		"#41569e",
		"#9d6d95",
		"#2bafca",
	];
};

export namespace World {
	export const LavaDamagePerTick = 0.25;
	export const ShrinkPerTick = 0.00005;
	export const InitialShieldTicks = 1.0 * TicksPerSecond;
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
	export const Spacing = 10;
	export const Margin = 5;
	export const Size = 50;
	export const Keys = [
		"a", "x",
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

			density: 2,
			radius: 0.005,
			speed: 0.4,
			maxTicks: 1 * TicksPerSecond,
			damage: 10,
			explodeOn: Categories.All,

			render: "projectile",
			trailTicks: 30,
		} as c.ProjectileTemplate,
	} as c.ProjectileSpell;

	export const firespray = {
		id: 'firespray',
		description: "Shoot a stream of fire in a narrow arc. Get closer to focus all your damage onto one target.",
		action: "spray",

		color: '#ff0044',
		icon: "bubblingBeam",

		maxAngleDiff: 0.01 * 2 * Math.PI,
		cooldown: 10 * TicksPerSecond,
		uninterruptible: true,

		intervalTicks: 0.025 * TicksPerSecond,
		lengthTicks: 0.5 * TicksPerSecond,

		jitterRatio: 0.4,

		projectile: {
			color: '#ff0044',

			density: 1.0,
			radius: 0.002,
			speed: 0.5,
			maxTicks: 0.3 * TicksPerSecond,
			damage: 5,
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
			maxTicks: 12 * TicksPerSecond,
			damage: 1,
			trailTicks: 15,
			explodeOn: 0,

			render: "projectile",
		} as c.ProjectileTemplate,
	} as c.ProjectileSpell;

	export const kamehameha = {
		id: 'kamehameha',
		description: "After a long charge time, unleash a powerful beam to defeat your enemies.",
		action: "spray",

		color: '#44ddff',
		icon: "glowingHands",

		maxAngleDiff: 0.01 * 2 * Math.PI,
		chargeTicks: 1 * TicksPerSecond,
		cooldown: 20 * TicksPerSecond,

		knockbackCancel: true,
		uninterruptible: false,
		jitterRatio: 0.0,

		intervalTicks: 0.1 * TicksPerSecond,
		lengthTicks: 3 * TicksPerSecond,

		projectile: {
			color: '#ffffff',

			density: 0.0001,
			radius: 0.005,
			speed: 3.0,
			maxTicks: 0.5 * TicksPerSecond,
			damage: 10,
			trailTicks: 1.0 * TicksPerSecond,
			collideWith: Categories.All,
			explodeOn: Categories.All,

			render: "ray",
		} as c.ProjectileTemplate,
	} as c.SpraySpell;

	export const lightning = {
		id: 'lightning',
		description: "Huge knockback, if your aim is good enough.",
		action: "projectile",

		color: '#00ddff',
		icon: "lightningHelix",

		maxAngleDiff: 0.01 * 2 * Math.PI,
		cooldown: 10 * TicksPerSecond,

		projectile: {
			color: '#00ddff',

			density: 4,
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
		description: "Follows the enemy. High damage, but only if the enemy doesn't know how to dodge.",
		action: "projectile",

		color: '#44ffcc',
		icon: "boltSaw",

		cooldown: 20 * TicksPerSecond,
		fireTowardsCurrentHeading: true,

		projectile: {
			color: '#44ffcc',

			density: 25,
			radius: 0.003,
			speed: 0.15,
			maxTicks: 6.0 * TicksPerSecond,
			damage: 20,
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
		description: "To the enemy, then back to you. All in a day's work.",
		action: "projectile",

		color: '#ff00ff',
		icon: "boomerangSun",

		maxAngleDiff: 0.01 * 2 * Math.PI,
		cooldown: 20 * TicksPerSecond,

		projectile: {
			color: '#ff00ff',
			selfColor: true,

			density: 25,
			radius: 0.003,
			speed: 0.4,
			maxTicks: 6.0 * TicksPerSecond,
			damage: 20,
			explodeOn: Categories.Hero,

			homing: {
				turnRate: 0.01 * 2 * Math.PI,
				maxTurnProportion: 0.1,
				minDistanceToTarget: 0.1,
				targetType: c.HomingTargets.self,
			} as c.HomingParameters,

			trailTicks: 1 * TicksPerSecond,

			render: "projectile",
		} as c.ProjectileTemplate,
	} as c.ProjectileSpell;

	export const link = {
		id: 'link',
		description: "Pull your enemy to you... while they pull you to them.",
		action: "projectile",

		color: '#0000ff',
		icon: "andromedaChain",

		maxAngleDiff: 0.01 * 2 * Math.PI,
		cooldown: 10 * TicksPerSecond,

		projectile: {
			color: '#4444ff',

			density: 0.001,
			radius: 0.005,
			speed: 0.3,
			maxTicks: 2.0 * TicksPerSecond,
			damage: 10,
			explodeOn: Categories.None,
			shieldTakesOwnership: false,

			link: {
				strength: 0.001 / TicksPerSecond,
				linkTicks: 2 * TicksPerSecond,
			} as c.LinkParameters,

			homing: {
				turnRate: 2 * Math.PI,
				minDistanceToTarget: 0.3,
				targetType: c.HomingTargets.self,
			} as c.HomingParameters,

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
			maxTicks: 3.0 * TicksPerSecond,
			damage: 5,
			explodeOn: Categories.All,
			bounce: {
				damageFactor: 0.9,
			},

			render: "ray",
			trailTicks: 1.0 * TicksPerSecond,
		} as c.ProjectileTemplate,
	} as c.ProjectileSpell;

	export const drain = {
		id: 'drain',
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
			speed: 0.4,
			maxTicks: 2.0 * TicksPerSecond,
			damage: 10,
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
		description: "Fire an orb that redirects towards the target enemy.",
		action: "projectile",

		color: '#0ace00',
		icon: "atomicSlashes",

		maxAngleDiff: 0.01 * 2 * Math.PI,
		cooldown: 20 * TicksPerSecond,

		projectile: {
			color: '#0ace00',

			density: 2,
			radius: 0.02,
			speed: 0.1,
			maxTicks: 3.0 * TicksPerSecond,
			damage: 1.0 / TicksPerSecond,
			collideWith: 0,
			explodeOn: Categories.All,

			gravity: {
				strength: 0.0001 / TicksPerSecond,
				turnRate: 10.0 / TicksPerSecond,
				radius: 0.2,
				power: 4,
			} as c.GravityParameters,

			render: "gravity",
			trailTicks: 0.25 * TicksPerSecond,
		} as c.ProjectileTemplate,
	} as c.ProjectileSpell;

	export const scourge = {
		id: 'scourge',
		description: "Takes time to charge, but will send nearby enemies flying. Be careful though, each scourge takes 10% off your health!",

		radius: Hero.Radius * 5,
		chargeTicks: 0.5 * TicksPerSecond,
		cooldown: 10 * TicksPerSecond,
		damage: 20,
		selfDamage: 10,
		minImpulse: 0.0002,
		maxImpulse: 0.0005,

		icon: "deadlyStrike",

		trailTicks: 30,
		color: '#ddbb00',

		action: "scourge",
	} as c.ScourgeSpell;

	export const shield = {
		id: 'shield',
		description: "Deflect any projectiles. Deflected projectiles become your projectiles. Try sending a 'homing' back to where it came from!",

		mass: 100000,
		maxTicks: 3 * TicksPerSecond,
		cooldown: 20 * TicksPerSecond,
		radius: Hero.Radius * 2,

		icon: "shield",

		color: '#3366ff',

		action: "shield",
	} as c.ShieldSpell;

	export const teleport = {
		id: 'teleport',
		description: "Teleport to a nearby location. Get close, or get away.",

		maxRange: 1.0,
		uninterruptible: true,
		cooldown: 10 * TicksPerSecond,

		icon: "teleport",

		color: '#6666ff',

		action: "teleport",
	} as c.TeleportSpell;

	export const thrust = {
		id: 'thrust',
		description: "Accelerate quickly, knocking away anything in your path.",

		maxAngleDiff: 0.01 * 2 * Math.PI,
		cooldown: 10 * TicksPerSecond,

		uninterruptible: true,

		damage: 10,
		maxTicks: 0.25 * TicksPerSecond,
		speed: 1.0,

		icon: "fireDash",
		color: '#ff00cc',
		action: "thrust",
	} as c.ThrustSpell;

	export const all: c.Spells = {
		move,
		fireball,
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
		scourge,
		shield,
		teleport,
		thrust,
	};
};

export namespace Choices {
	export const Options = {
		"a": ["teleport", "thrust"],
		"x": ["shield", "gravity", "drain"],
		"q": ["fireball"],
		"w": ["lightning", "kamehameha"],
		"e": ["homing", "boomerang"],
		"r": ["meteor", "link"],
		"d": ["bouncer", "firespray"],
		"f": ["scourge"],
	} as c.KeyBindingOptions;

	export const Defaults = {
		"a": "teleport",
		"x": "shield",
		"q": "fireball",
		"w": "lightning",
		"e": "homing",
		"r": "meteor",
		"d": "bouncer",
		"f": "scourge",
	} as c.KeyBindings;
}