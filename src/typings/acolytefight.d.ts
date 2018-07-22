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
    SeparationStrength: number;

    TurnFractionPerTick: number;
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
	layoutAngleOffset: number;

	// Properties of an individual obstacle
	numPoints: number;
	extent: number;
	orientationAngleOffset: number;
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
	explodeOn: number;
	shieldTakesOwnership?: boolean;

    trailTicks: number;

    color: string;
    selfColor?: boolean;
    render: string;
}

declare interface GravityParameters {
	strength: number;
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
	turnRate: number;
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

declare interface HomingParameters {
	turnRate: number;
	maxTurnProportion: number;
	minDistanceToTarget: number;
	targetType: string;
	afterTick: number;
	redirectionTick: number | null;
	speedWhenClose: number;
}

declare interface LinkParameters {
	strength: number;
	lifeSteal: number;
	linkTicks: number;
}

declare interface DetonateParameters {
	radius: number;
	minImpulse: number;
	maxImpulse: number;
	detonateTick: number;
	waitTicks: number;
}

declare interface DamagePacket {
	damage: number;
	lifeSteal?: number;
}
