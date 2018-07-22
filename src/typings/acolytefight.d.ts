/*

Units - general conventions:
* Distance: If you're on a horizontal monitor, the distance from the top of the screen to the bottom is 1.0.
* Time: Either ticks or seconds. There are 60 ticks per second.
* Speed: Distance per second.
* Angles: Revolutions. e.g. maxAngleDiff: 0.25 means the spell can be cast when the acolyte is one quarter-turn away from facing the target directly.
* Angular speeds: Revolutions per second.
* Health: Percentages. Heroes start with 100.
* Lifesteal: Fraction of damage translated into lifesteal. e.g. 1.0 for drain, 0.5 for link.
* Densities, forces, impulses: These are a bit arbitrary and don't really have units. Heroes have a density of 0.5 and everything has been set relative to that.

Collision category flags (categories, expireOn and collideWith):
* All = 0xFFFF
* Hero = 0x1
* Projectile = 0x2
* Massive = 0x4
* Obstacle = 0x8
* Shield = 0x10
* None = 0

*/

declare interface AcolyteFightSettings {
    Layouts: Layouts;
    Hero: HeroSettings;
    World: WorldSettings;
    Obstacle: ObstacleSettings;
    Spells: Spells;
    Choices: ChoiceSettings;
}

declare interface HeroSettings {
    MoveSpeedPerSecond: number;
    Radius: number;
    Density: number;

    AngularDamping: number;
    Damping: number;

    AdditionalDamageMultiplier: number;
    AdditionalDamagePower: number;

    MaxHealth: number;
    SeparationImpulsePerTick: number;

    RevolutionsPerTick: number;
}

declare interface WorldSettings {
	InitialRadius: number;
	HeroLayoutRadius: number;

	LavaDamagePerSecond: number;
	ShrinkPerSecond: number;
    InitialShieldSeconds: number;
}

declare interface Layouts {
    [name: string]: Layout;
}

declare interface Layout {
	obstacles: ObstacleTemplate[];
}

declare interface ObstacleTemplate {
	// Where to place the obstacles
	numObstacles: number;
	layoutRadius: number;
	layoutAngleOffsetInRevs: number;

	// Properties of an individual obstacle
	numPoints: number;
	extent: number;
	orientationAngleOffsetInRevs: number;
}

declare interface ObstacleSettings {
	Health: number;
	AngularDamping: number;
	LinearDamping: number;
	Density: number;
}

declare interface ChoiceSettings {
	Keys: string[];
	Options: KeyBindingOptions;
	Defaults: KeyBindings;
}

declare interface Spells {
    [key: string]: Spell;
}

declare type Spell =
	MoveSpell
	| ProjectileSpell
	| SpraySpell
	| ScourgeSpell
	| ShieldSpell
	| TeleportSpell
	| ThrustSpell
	| WallSpell;

declare interface SpellBase {
	id: string;
	name?: string;
    description: string;
	action: string;
	untargeted?: boolean;

	maxAngleDiffInRevs?: number;

    chargeTicks?: number;
    cooldown: number;
    interruptible?: boolean;
    knockbackCancel?: boolean;

    icon?: string;

    color: string;
}

declare interface MoveSpell extends SpellBase {
    action: "move";
}

declare interface ProjectileSpell extends SpellBase {
    action: "projectile";

	projectile: ProjectileTemplate;
}

declare interface SpraySpell extends SpellBase {
    action: "spray";

    projectile: ProjectileTemplate;

    intervalTicks: number;
    lengthTicks: number;

    jitterRatio: number;
}

declare interface WallSpell extends SpellBase {
	action: "wall";

	maxRange: number;

	length: number;
	width: number;

	health: number;
	maxTicks: number;
}

declare interface ProjectileTemplate extends DamagePacket {
	damage: number;
	damageScaling?: boolean;
    bounce?: BounceParameters;

    density: number;
    radius: number;
	speed: number;
	maxSpeed?: number;

    homing?: HomingParametersTemplate;
	link?: LinkParameters;
	gravity?: GravityParameters;
	detonate?: DetonateParametersTemplate;
	lifeSteal?: number;

	maxTicks: number;
	categories?: number;
    collideWith?: number;
	expireOn: number;
	shieldTakesOwnership?: boolean;

    trailTicks: number;

    color: string;
    selfColor?: boolean;
    render: string;
}

declare interface GravityParameters {
	impulsePerTick: number;
	ticks: number;
	radius: number;
	power: number;
}

declare interface BounceParameters {
    damageFactor: number;
}

declare interface HomingParametersTemplate {
	minDistanceToTarget?: number;
	speedWhenClose?: number;
	revolutionsPerSecond: number;
	maxTurnProportion?: number;
    targetType?: string;
	redirect?: boolean;
	afterTicks?: number;
}

declare interface DetonateParametersTemplate {
	radius: number;
	minImpulse: number;
	maxImpulse: number;
	waitTicks?: number;
}

declare interface ScourgeSpell extends SpellBase {
    action: "scourge";

    damage: number;
	selfDamage: number;
	damageScaling?: boolean;

    radius: number;

    minImpulse: number;
    maxImpulse: number;

    trailTicks: number;
}

declare interface ShieldSpell extends SpellBase {
    action: "shield";

    maxTicks: number;
    radius: number;
}

declare interface TeleportSpell extends SpellBase {
    action: "teleport";

    maxRange: number;
}

declare interface ThrustSpell extends SpellBase {
    action: "thrust";

	damage: number;
	damageScaling?: boolean;
    maxTicks: number;
    speed: number;
}

declare interface KeyBindingOptions {
    [key: string]: string[];
}

declare interface KeyBindings {
    [key: string]: string;
}

declare interface LinkParameters {
	impulsePerTick: number;
	lifeSteal: number;
	linkTicks: number;
}

declare interface DamagePacket {
	damage: number;
	lifeSteal?: number;
}
