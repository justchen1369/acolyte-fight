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
* Solid = 0x20 // all projectiles except Fireball are solid
* None = 0

*/

declare interface AcolyteFightSettings {
	Mod: ModSettings;
    Layouts: Layouts;
    Hero: HeroSettings;
    World: WorldSettings;
    Obstacle: ObstacleSettings;
    Spells: Spells;
	Choices: ChoiceSettings;
	Sounds: Sounds;
	Icons: IconLookup;
	Render: RenderSettings;
}

declare type ModTree = {
	[K in keyof AcolyteFightSettings]?: any;
}

declare interface ModSettings {
	name: string;
	author: string;
	description: string;
}

declare interface HeroSettings {
    MoveSpeedPerSecond: number;
    Radius: number;
    Density: number;

    AngularDamping: number;
	Damping: number; // How quickly knockback decayed. Higher number, faster decay.
	
	DamageMitigationTicks: number; // Within these many ticks, damage does not stack between multiple players

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
	ShrinkPower: number; // Make the shrinking non-linear. Higher values mean faster shrinking at the start of the game.
	InitialShieldSeconds: number; // How many seconds of shield a new player has when entering the game
	
	ProjectileSpeedDecayFactorPerTick: number; // If a projectile is going faster or slower than its intended speed, correct it by this proportion per tick
	ProjectileSpeedMaxError: number; // Only correct a projectile's speed if its error is more than this absolute value
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
	Keys: KeyConfig[];
	Options: KeyBindingOptions;
	Defaults: KeyBindings;
	Special: KeyBindings;
}

declare interface KeyConfig {
	btn: string;
	weight?: number;
}

declare interface Spells {
    [key: string]: Spell;
}

declare type Spell =
	MoveSpell
	| StopSpell
	| RetargetSpell
	| ProjectileSpell
	| ReflectSpell
	| RetractorSpell
	| SpraySpell
	| ScourgeSpell
	| TeleportSpell
	| ThrustSpell
	| WallSpell;

declare interface SpellBase {
	id: string;
	name?: string;
    description: string;
	action: string; // Which action function to use
	sound?: string; // Which sound to use for charging/channelling
	untargeted?: boolean; // No target required. i.e. cast instantly when you click the button

	maxAngleDiffInRevs?: number; // How much does the acolyte have to turn to face the target?

	chargeTicks?: number; // The number of ticks of charge-up time before casting the spell
	movementProportionWhileCharging?: number; // Proportion of movement to allow during the charge-up time
	movementProportionWhileChannelling?: number; // Proportion of movement to allow during the channelling of the spell
	revsPerTickWhileCharging?: number; // If set, defines how quickly the hero can orient themselves towards the cursor while charging
	revsPerTickWhileChannelling?: number; // If set, defines how quickly the hero can orient themselves towards the cursor while channelling
	numCharges?: number;
    cooldown: number;
    interruptible?: boolean; // Whether this spell can be interrupted by moving.
    movementCancel?: boolean; // Whether moving cancels the spell.
    knockbackCancel?: boolean; // If this spell is being channelled, whether knockback cancels it.

    icon?: string;

    color: string; // The colour of the button for this spell (not the projectile)
}

declare interface MoveSpell extends SpellBase {
	action: "move";
	cancelChanneling: boolean;
}

declare interface StopSpell extends SpellBase {
    action: "stop";
}

declare interface RetargetSpell extends SpellBase {
    action: "retarget";
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

declare interface RetractorSpell extends SpellBase {
	action: "retractor";
	
	projectile: ProjectileTemplate;

	retractCooldownTicks: number; // Must wait this many ticks before retracting
	retractBehaviours: BehaviourParamsTemplate[]; // Add these behaviours to the projectile when retracted
}

declare interface ProjectileTemplate extends DamagePacket {
	damage: number;
	damageScaling?: boolean; // Whether to apply damage scaling to this projectile
	partialDamage?: PartialDamageParameters;

    density: number;
    radius: number;
	speed: number;
	fixedSpeed?: boolean; // if true or undefined, the projectile's speed will be corrected according to ProjectileSpeedDecayFactorPerTick if it becomes faster or slower due to collisions
	strafe?: boolean; // if true, the projectile will move with the hero's movement

    bounce?: BounceParameters;
	link?: LinkParameters;
	gravity?: GravityParameters; // Trap a hero
	detonate?: DetonateParameters; // Explode at target
	lifeSteal?: number; // 1.0 means all damage is returned as health to the owner of the projectile

	behaviours?: BehaviourParamsTemplate[],

	minTicks?: number; // The minimum number of ticks that a projectile will live for. The main purpose of this is to work around a quirk in the physics engine where if projectiles doesn't live for more than 1 tick, it doesn't affect the physics.
	maxTicks: number; // The maximum number of ticks that a projectile will live for. The maximum range can be determined by speed * maxTicks / TicksPerSecond.
	categories?: number; // Collision flags: What flags this object has
	collideWith?: number; // Collision flags: Which other objects to collide with
	expireOn?: number; // Collision flags: The projectile will expire if it hits any of these objects
	expireAfterCursorTicks?: number; // Expire this many ticks after the cursor is reached
	shieldTakesOwnership?: boolean; // If the projectile hits a shield, does it switch owner?

	renderers: RenderParams[]; // Which render function to use
	sound?: string;
	soundHit?: string;
}

declare interface PartialDamageParameters {
	initialMultiplier: number; // Initially, the projectile initially does this multiplier
	ticks: number; // The projectile linearly grows to full damage when it reaches this lifetime
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

declare type BehaviourParamsTemplate =
	HomingParametersTemplate
	| RedirectParametersTemplate

declare type HomingType = "self" | "enemy" | "cursor";

declare interface BehaviourParamsBase {
	type: string;

	afterTicks?: number; // Redirect after this many ticks
	atCursor?: boolean; // Redirect when projectile reaches cursor
}

declare interface HomingParametersTemplate extends BehaviourParamsBase {
	type: "homing";
	targetType?: HomingType; // Whether to home towards "self", "enemy" or "cursor". Defaults to "enemy".

	revolutionsPerSecond: number; // The maximum turn rate of the homing projectile
	maxTurnProportion?: number; // The turn rate cannot be more than this proportion of the difference between ideal and current angle. Used to make homing spells dodgeable.

	minDistanceToTarget?: number; // Homing is only applied if the projectile is further than this. Used to keep projectiles orbiting at a particular distance.
}

declare interface RedirectParametersTemplate extends BehaviourParamsBase {
	type: "redirect";
	targetType?: HomingType; // Whether to redirect towards "self", "enemy" or "cursor". Defaults to "enemy".
	newSpeed?: number;
}

declare interface DetonateParameters extends DamagePacket {
	outerDamage?: number;

	radius: number; // The radius of the explosion
	
	minImpulse: number; // The outer rim of the explosion will cause this much knockback
	maxImpulse: number; // The epicenter of the explosion will cause this much knockback

	renderTicks: number; // Length of explosion
}

declare type RenderParams =
	RenderRay
	| RenderProjectile
	| RenderSwirl
	| RenderLink
	| RenderReticule

declare interface RenderParamsBase {
	type: string;
}

declare interface ProjectileColorParams {
    color: string; // Color of the projectile
    selfColor?: boolean; // What color should the projectile look like to the owner? So they can tell it is theirs.
}

declare interface RenderRay extends RenderParamsBase, ProjectileColorParams {
	type: "ray";
	intermediatePoints?: boolean; // A ray might be so fast that we need to render the subtick that it made contact, otherwise it doesn't look like it touched the other object at all

    ticks: number; // How long is the trail?
}

declare interface RenderProjectile extends RenderParamsBase, ProjectileColorParams {
	type: "projectile";

    ticks: number; // How long is the trail?
}

declare interface RenderSwirl extends RenderParamsBase {
	type: "swirl";
	radius: number;
	color: string;
	selfColor?: boolean;
	ticks: number; // How long is the trail?

	loopTicks: number; // How long for the swirl to do one full rotation?

	numParticles: number;
	particleRadius: number;
}

declare interface RenderLink extends RenderParamsBase {
	type: "link";
	color: string;
	width: number;
}

declare interface RenderReticule extends RenderParamsBase {
	type: "reticule";
	color: string;
	ticks: number;
	radius: number;
}

declare interface ScourgeSpell extends SpellBase {
    action: "scourge";

    damage: number;
	selfDamage: number;
	minSelfHealth: number;
	damageScaling?: boolean;

    radius: number;

    minImpulse: number;
    maxImpulse: number;

    trailTicks: number;
}

declare interface ShieldSpell extends SpellBase {
	maxTicks: number;
	takesOwnership: boolean;
	blocksTeleporters: boolean;
}

declare interface ReflectSpell extends ShieldSpell {
    action: "shield";
    radius: number;
}

declare interface WallSpell extends ShieldSpell {
	action: "wall";

	maxRange: number;

	length: number;
	width: number;

	growthTicks: number;
	maxTicks: number;

	categories?: number; // Use this to make a wall an impassable obstacle
	selfPassthrough?: boolean; // Whether to always allow the owner to pass through the wall
}

declare interface DashSpell extends SpellBase {
}

declare interface TeleportSpell extends DashSpell {
	action: "teleport";
	range: number;
}

declare interface ThrustSpell extends DashSpell {
    action: "thrust";

	range: number;
	bounceTicks: number; // If a hero crashes into something with thrust, the number of ticks they will bounce off for before coming to a stop
	damage: number;
	damageScaling?: boolean;
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
	minDistance: number;
	maxDistance: number;
}

declare interface DamagePacket {
	damage: number;
	lifeSteal?: number;
	isLava?: boolean;
}

declare interface RenderSettings {
	link: RenderLink;
	gravity: RenderSwirl;
}

declare interface Vec2 {
	x: number;
	y: number;
}

interface IconLookup {
	[key: string]: Icon;
}

interface Icon {
	path: string; // The SVG path of the icon
	credit?: string; // A link to where the icon is from - not used by the game, just to give credit to the author
}

type WaveType = "sine" | "square" | "sawtooth" | "triangle" | "brown-noise";

interface Sounds {
	[key: string]: Sound;
}

interface Sound {
	start?: SoundBite[];

	sustain?: SoundBite[];
	repeatIntervalSeconds?: number;
	cutoffSeconds?: number; // If this sound is stopped early, ramp volume to zero over this many seconds
	cutoffEarly?: boolean; // Whether to cutoff the sound early if the action is cancelled (e.g. if the spell stops charging). Defaults to true.
}

interface SoundBite {
	volume?: number;

	startTime?: number;
	stopTime: number;

	startFreq?: number;
    stopFreq?: number;

    tremoloFreq?: number;
	tremoloStrength?: number;

	modStartFreq?: number;
	modStopFreq?: number;
	modStartStrength?: number;
	modStopStrength?: number;

	highPass?: number;
	lowPass?: number;

	attack?: number;
	decay?: number;

	wave: WaveType;
	ratios?: number[];
}

declare interface WorldContract {
	tick: number;
	prestarted: boolean; // Whether spells are allowed to be cast yet
	started: boolean; // Whether heroes can take damage yet

	heroes: { [id: string]: HeroContract };
	projectiles: { [id: string]: ProjectileContract };
	obstacles: { [id: string]: ObstacleContract };

	radius: number; // The current radius of the stage

	ticksPerSecond: number;
}

declare interface WorldObjectContract {
	id: string;
	pos: Vec2;
	velocity: Vec2;
}

declare interface HeroContract extends WorldObjectContract {
	health: number; // The current health of the hero (out of 100)
	heading: Vec2; // A unit vector representing the direction the Hero is currently facing
	radius: number; // The radius of the hero
	linkedToId?: string; // If set, this Hero currently has trapped another Hero in a link. This is the ID of the other Hero (the "victim").
	casting?: CastingContract; // If set, currently casting a channelled spell
	shieldTicksRemaining: number; // The number of ticks that the hero will continue to be shielded for, 0 if unshielded
}

declare interface ProjectileContract extends WorldObjectContract {
	ownerId: string;
	spellId: string;

	radius: number;

	damage: number;
	lifeSteal: number; // The fraction (between 0 and 1) of damage which will be return to the owner as health if this projectile hits someone.
}

declare interface CastingContract {
	spellId: string;
}

declare interface CooldownsRemainingContract {
	[spellId: string]: number;
}

declare interface ObstacleContract extends WorldObjectContract {
	extent: number;
	numPoints: number;
}

declare interface ActionContract {
	spellId: string;
	target: Vec2;
}

declare type MsgContract =
	InitMsgContract
    | StateMsgContract
	| ActionMsgContract

declare interface InitMsgContract {
	type: "init";
	settings: AcolyteFightSettings;
}

declare interface StateMsgContract {
	type: "state";
	heroId: string;
    state: WorldContract;
    cooldowns: CooldownsRemainingContract;
}

declare interface ActionMsgContract {
    type: "action";
    action: ActionContract;
}