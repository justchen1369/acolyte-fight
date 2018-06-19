import * as c from './constants.model';

export const TicksPerSecond = 60;
export const Pixel = 0.001;

export namespace Categories {
	export const All = 0xFFFF;
	export const Hero = 1;
	export const Projectile = 2;
}

export namespace Matchmaking {
	export const JoinPeriod = 5 * TicksPerSecond;
	export const MaxHistoryLength = 180 * TicksPerSecond;
	export const MaxPlayers = 10;
}

export namespace Hero {
	export const MoveSpeedPerTick = 0.12 / TicksPerSecond;
	export const Radius = 0.01;
	export const Density = 1;
	export const MaxDamping = 5;
	export const MinDamping = 0.25;
	export const MaxHealth = 100;

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
	export const List = [
		"teleport",
		"shield",
		null,
		"fireball",
		"lightning",
		"homing",
		"meteor",
		null,
		"bouncer",
		"scourge",
	];
}

export namespace Spells {
	export const move = {
		id: 'move',
		cooldown: 0,
		action: "move",
	} as c.MoveSpell;

	export const fireball = {
		id: 'fireball',
		action: "projectile",

		key: 'q',
		color: '#ff8800',
		icon: "thunderball",

		projectile: {
			color: '#ff8800',

			density: 25,
			radius: 0.005,
			speed: 0.4,
			chargeTicks: 0,
			maxTicks: 1 * TicksPerSecond,
			cooldown: 1 * TicksPerSecond,
			damage: 10,
			explodeOn: Categories.Hero,

			trailTicks: 30,

			render: "projectile",
		} as c.ProjectileTemplate,
	} as c.ProjectileSpell;

	export const meteor = {
		id: 'meteor',
		action: "projectile",

		key: 'r',
		color: '#ff0000',
		icon: "meteorImpact",

		projectile: {
			color: '#ff0000',

			density: 10000,
			radius: 0.03,
			speed: 0.2,
			chargeTicks: 0.1 * TicksPerSecond,
			maxTicks: 12 * TicksPerSecond,
			cooldown: 12 * TicksPerSecond,
			damage: 1,
			trailTicks: 15,
			explodeOn: 0,

			render: "projectile",
		} as c.ProjectileTemplate,
	} as c.ProjectileSpell;

	export const lightning = {
		id: 'lightning',
		action: "projectile",

		key: 'w',
		color: '#00ddff',
		icon: "lightningHelix",

		projectile: {
			color: '#00ddff',

			density: 3,
			radius: 0.0025,
			speed: 3.0,
			chargeTicks: 0,
			maxTicks: 0.5 * TicksPerSecond,
			cooldown: 10 * TicksPerSecond,
			damage: 1,
			explodeOn: Categories.All,

			trailTicks: 30,

			render: "ray",
		} as c.ProjectileTemplate,
	} as c.ProjectileSpell;

	export const homing = {
		id: 'homing',
		action: "projectile",

		key: 'e',
		color: '#44ffcc',
		icon: "boltSaw",

		projectile: {
			color: '#44ffcc',

			density: 25,
			radius: 0.003,
			speed: 0.15,
			chargeTicks: 0,
			maxTicks: 6.0 * TicksPerSecond,
			cooldown: 20 * TicksPerSecond,
			damage: 20,
			turnRate: 0.05,
			explodeOn: Categories.Hero,

			trailTicks: 30,

			render: "projectile",
		} as c.ProjectileTemplate,
	} as c.ProjectileSpell;

	export const bouncer = {
		id: 'bouncer',
		action: "projectile",

		key: 'd',
		color: '#88ee22',
		icon: "divert",

		projectile: {
			color: '#88ee22',

			density: 2,
			radius: 0.001,
			speed: 0.75,
			chargeTicks: 0,
			maxTicks: 3.0 * TicksPerSecond,
			cooldown: 10 * TicksPerSecond,
			damage: 2,
			turnRate: 0.025,
			explodeOn: Categories.All,
			bounce: {
				damageFactor: 0.95,
			},

			trailTicks: 1.0 * TicksPerSecond,

			render: "ray",
		} as c.ProjectileTemplate,
	} as c.ProjectileSpell;

	export const scourge = {
		id: 'scourge',
		radius: Hero.Radius * 5,
		chargeTicks: 0.5 * TicksPerSecond,
		cooldown: 10 * TicksPerSecond,
		damage: 20,
		selfDamage: 10,
		minImpulse: 0.0002,
		maxImpulse: 0.0005,

		key: 'f',
		icon: "deadlyStrike",

		trailTicks: 30,
		color: '#ddbb00',

		action: "scourge",
	} as c.ScourgeSpell;

	export const shield = {
		id: 'shield',
		mass: 100000,
		chargeTicks: 0,
		maxTicks: 1 * TicksPerSecond,
		cooldown: 20 * TicksPerSecond,
		radius: Hero.Radius * 2,

		key: 'x',
		icon: "shield",

		color: '#3366ff',

		action: "shield",
	} as c.ShieldSpell;

	export const teleport = {
		id: 'teleport',
		maxRange: 0.35,
		chargeTicks: 3,
		cooldown: 15 * TicksPerSecond,

		key: 'z',
		icon: "teleport",

		color: '#6666ff',

		action: "teleport",
	} as c.TeleportSpell;

	export const all: c.Spells = {
		move,
		fireball,
		meteor,
		lightning,
		homing,
		bouncer,
		scourge,
		shield,
		teleport,
	};
};