export const TicksPerSecond = 60;

export const HeroColors = [
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

export const Hero = {
	MoveSpeedPerTick: 0.12 / TicksPerSecond,
	Radius: 0.01,
	Density: 1,
	MaxDamping: 5,
	MinDamping: 0.25,
	MaxHealth: 100,
};

export const World = {
	LavaDamagePerTick: 0.25,
	ShrinkPerTick: 0.00005,
}

export const Pixel = 0.001;

export const MyHeroColor = '#00ccff';

export const HealthBar = {
	Radius: Hero.Radius * 0.9,
	Height: Pixel * 3,
	Margin: Pixel * 2,
}
export const ChargingIndicator = {
	Margin: Pixel * 5,
	Width: Pixel * 2,
}
export const ButtonBar = {
	Spacing: 10,
	Margin: 5,
	Size: 50,
}

export const Spells = {
	move: {
		id: 'move',
		cooldown: 0,
		action: "move",
	},
	fireball: {
		id: 'fireball',
		density: 25,
		radius: 0.005,
		speed: 0.4,
		chargeTicks: 0,
		maxTicks: 1 * TicksPerSecond,
		cooldown: 1 * TicksPerSecond,
		damage: 10,
		explodesOnImpact: true,

		key: 'q',
		icon: "thunderball",

		trailTicks: 30,
		fillStyle: '#ff8800',

		action: "projectile",
		render: "projectile",
	},
	meteor: {
		id: 'meteor',
		density: 10000,
		radius: 0.03,
		speed: 0.2,
		chargeTicks: 0.1 * TicksPerSecond,
		maxTicks: 12 * TicksPerSecond,
		cooldown: 12 * TicksPerSecond,
		damage: 1,

		key: 'r',
		icon: "meteorImpact",

		trailTicks: 15,
		fillStyle: '#ff0000',

		action: "projectile",
		render: "projectile",
	},
	lightning: {
		id: 'lightning',
		density: 3,
		radius: 0.0025,
		speed: 3.0,
		chargeTicks: 0,
		maxTicks: 0.5 * TicksPerSecond,
		cooldown: 10 * TicksPerSecond,
		damage: 1,
		explodesOnImpact: true,

		key: 'w',
		icon: "lightningHelix",

		trailTicks: 30,
		fillStyle: '#00ddff',

		action: "projectile",
		render: "ray",
	},
	homing: {
		id: 'homing',
		density: 25,
		radius: 0.003,
		speed: 0.15,
		chargeTicks: 0,
		maxTicks: 6.0 * TicksPerSecond,
		cooldown: 20 * TicksPerSecond,
		damage: 20,
		turnRate: 0.05,
		explodesOnImpact: true,

		key: 'e',
		icon: "boltSaw",

		trailTicks: 30,
		fillStyle: '#44ffcc',

		action: "projectile",
		render: "projectile",
	},
	bouncer: {
		id: 'bouncer',
		density: 2,
		radius: 0.001,
		speed: 0.75,
		chargeTicks: 0,
		maxTicks: 3.0 * TicksPerSecond,
		cooldown: 10 * TicksPerSecond,
		damage: 2,
		turnRate: 0.025,
		explodesOnImpact: true,
		bounceDamage: 0.95,

		key: 'd',
		icon: "divert",

		trailTicks: 1.0 * TicksPerSecond,
		fillStyle: '#88ee22',

		action: "projectile",
		render: "ray",
	},
	scourge: {
		id: 'scourge',
		radius: Hero.Radius * 5,
		chargeTicks: 0.5 * TicksPerSecond,
		maxTicks: 1,
		cooldown: 10 * TicksPerSecond,
		damage: 20,
		selfDamage: 10,
		minImpulseMagnitude: 0.0002,
		maxImpulseMagnitude: 0.0005,

		key: 'f',
		icon: "deadlyStrike",

		trailTicks: 30,
		fillStyle: '#ddbb00',

		action: "scourge",
	},
	shield: {
		id: 'shield',
		mass: 100000,
		chargeTicks: 0,
		maxTicks: 1 * TicksPerSecond,
		cooldown: 20 * TicksPerSecond,
		radius: Hero.Radius * 2,

		key: 'x',
		icon: "shield",

		fillStyle: '#3366ff',

		action: "shield",
	},
	teleport: {
		id: 'teleport',
		maxRange: 0.35,
		chargeTicks: 3,
		cooldown: 15 * TicksPerSecond,

		key: 'z',
		icon: "teleport",

		fillStyle: '#6666ff',

		action: "teleport",
	},
};