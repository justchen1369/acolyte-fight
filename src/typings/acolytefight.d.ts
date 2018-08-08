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
    Damping: number; // How quickly knockback decayed. Higher number, faster decay.

    AdditionalDamageMultiplier: number; // Damage scaling
    AdditionalDamagePower: number;

    MaxHealth: number;
    SeparationImpulsePerTick: number; // The force which stops heroes going inside each other

    RevolutionsPerTick: number; // Hero turn rate
}

declare interface WorldSettings {
	InitialRadius: number; // Initial radius of the world
	HeroLayoutRadius: number; // The radius at which to place heroes

	LavaDamagePerSecond: number;
	SecondsToShrink: number;
	ShrinkPower: number;
    InitialShieldSeconds: number; // How many seconds of shield a new player has when entering the game
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
	extent: number; // aka radius but for a polygon
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
	action: string; // Which action function to use
	untargeted?: boolean; // No target required. i.e. cast instantly when you click the button

	maxAngleDiffInRevs?: number; // How much does the acolyte have to turn to face the target?

    chargeTicks?: number; // The number of ticks of charge-up time before casting the spell
    cooldown: number;
    interruptible?: boolean; // Whether this spell can be interrupted by moving.
    knockbackCancel?: boolean; // If this spell is being channelled, whether knockback cancels it.

    icon?: string;

    color: string; // The colour of the button for this spell (not the projectile)
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

    intervalTicks: number; // Spray shoots a new projectile every intervalTicks
    lengthTicks: number; // Spray continues creating new projectiles until lengthTicks has passed

    jitterRatio: number; // The spread of the spray. 1.0 means it should go out to 45 degrees either side. Weird units, I know.
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
	damageScaling?: boolean; // Whether to apply damage scaling to this projectile
    bounce?: BounceParameters;

    density: number;
    radius: number;
	speed: number;
	maxSpeed?: number; // Projectile will expire if it is accelerated above this speed (e.g. by a thrust).

    homing?: HomingParametersTemplate;
	link?: LinkParameters;
	gravity?: GravityParameters; // Trap a hero
	detonate?: DetonateParametersTemplate; // Explode at target
	lifeSteal?: number; // 1.0 means all damage is returned as health to the owner of the projectile

	maxTicks: number;
	categories?: number; // Collision flags: What flags this object has
    collideWith?: number; // Collision flags: Which other objects to collide with
	expireOn: number; // Collision flags: The projectile will expire if it hits any of these objects
	shieldTakesOwnership?: boolean; // If the projectile hits a shield, does it switch owner?

    trailTicks: number; // How long is the trail? (Visual effect only)

    color: string; // Color of the projectile
    selfColor?: boolean; // What color should the projectile look like to the owner? So they can tell it is theirs.
    render: string; // Which render function to use
}

declare interface GravityParameters {
	ticks: number; // How long the trap lasts for
	impulsePerTick: number; // Force to apply each tick to a trapped hero (pre-scaling)
	radius: number; // Scale factor: The force scales to zero at this radius
	power: number; // Scale factor: The power curve to apply to the scaling
}

declare interface BounceParameters {
    damageFactor: number; // Used to decay the bouncer from repeated hits. 0.9 means it loses 10% damage each time.
}

declare interface HomingParametersTemplate {
	targetType?: string; // Whether to home towards "self", "enemy" or "cursor"

	revolutionsPerSecond: number; // The maximum turn rate of the homing projectile
	maxTurnProportion?: number; // The turn rate cannot be more than this proportion of the difference between ideal and current angle. Used to make homing spells dodgeable.

	afterTicks?: number; // Only apply homing after this many ticks
	redirect?: boolean; // Redirect after a certain number of ticks

	minDistanceToTarget?: number; // Homing is only applied if the projectile is further than this. Used to keep projectiles orbiting at a particular distance.
	speedWhenClose?: number; // When the projectile is within minDistanceToTarget, change the speed to this. Used to stop projectiles when they reach targets.
}

declare interface DetonateParametersTemplate {
	radius: number; // The radius of the explosion
	
	minImpulse: number; // The outer rim of the explosion will cause this much knockback
	maxImpulse: number; // The epicenter of the explosion will cause this much knockback

	waitTicks?: number; // Don't explode straight away
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
