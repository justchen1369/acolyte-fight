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
* Blocker = 0x20 // all projectiles except Fireball/Fireboom are solid
* None = 0

*/

declare interface AcolyteFightSettings {
	Mod: ModSettings;
	Layouts: Layouts;
    Hero: HeroSettings;
    World: WorldSettings;
	Obstacle: ObstacleSettings;
	ObstacleTemplates: ObstacleTemplateLookup;
    Spells: Spells;
	Choices: ChoiceSettings;
	Sounds: Sounds;
	Icons: IconLookup;
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
	MaxSpeed: number; // Limit speed - corrects some physics engine errors which can speed up the hero and eject them from the map uncontrollably
    Radius: number;
    Density: number;

    AngularDamping: number;
	Damping: number; // How quickly knockback decayed. Higher number, faster decay.
	
	DamageMitigationTicks: number; // Within these many ticks, damage does not stack between multiple players

	ThrottleTicks: number; // Within these many ticks, disallow multiple spells to be cast by the same hero

    AdditionalDamageMultiplier: number; // Damage scaling
    AdditionalDamagePower: number;

    MaxHealth: number;
    SeparationImpulsePerTick: number; // The force which stops heroes going inside each other

	RevolutionsPerTick: number; // Hero turn rate

	InitialStaticSeconds: number; // How many seconds a new player at the start of the game that a player cannot be knocked back
}

declare interface WorldSettings {
	InitialRadius: number; // Initial radius of the world
	HeroLayoutRadius: number; // The radius at which to place heroes

	LavaDamagePerSecond: number;
	SecondsToShrink: number;
	ShrinkPowerMinPlayers: number; // Make the shrinking non-linear. Higher values mean faster shrinking at the start of the game.
	ShrinkPowerMaxPlayers: number;
	
	ProjectileSpeedDecayFactorPerTick: number; // If a projectile is going faster or slower than its intended speed, correct it by this proportion per tick
	ProjectileSpeedMaxError: number; // Only correct a projectile's speed if its error is more than this absolute value

	SwatchHealth: number;
}

declare interface Layouts {
    [name: string]: Layout;
}

declare interface Layout {
	obstacles: ObstacleLayout[];
	numPoints?: number; // Number of points to this layout, defaults to zero (circle)
	angleOffsetInRevs?: number; // Rotate the map by this angle, defaults to zero
	radiusMultiplier?: number; // Change the radius of the world by this proportion, defaults to 1.0
}

declare interface ObstacleLayout {
	// Properties
	type?: string;
	health?: number;

	// Layout
	numObstacles: number;
	layoutRadius: number;
	layoutAngleOffsetInRevs?: number;
	pattern?: number[];

	// Individual obstacle
	numPoints?: number; // Make this a rotationally-symmetric polygon, otherwise make this an arc
	extent: number; // aka radius but for a polygon
	orientationAngleOffsetInRevs?: number; // Rotate the shape
	angularWidthInRevs?: number; // For trapezoid or arcs
}

declare type SwatchRender =
	SwatchFill
	| SwatchSmoke

declare interface SwatchFill {
	type: "solid";

	color: string;
	deadColor?: string;

	expand?: number;
	glow?: number;
	strikeGrow?: number;
	flash?: boolean;
}

declare interface SwatchSmoke {
	type: "smoke";

	color: string;
	particleRadius: number;
	fade?: string;

	ticks: number;
	interval?: number;
	speed: number;
	conveyor?: number; // 1 means move at the same speed as the conveyor, 0.5 means half speed, etc
}

declare interface ObstacleSettings {
	AngularDamping: number;
	LinearDamping: number;
	Density: number;

	// These values control how quickly obstacles return to their initial positions before the game starts
	ReturnProportion: number;
	ReturnMinSpeed: number;
	ReturnTurnRate: number;
}

declare interface ObstacleTemplateLookup {
	[key: string]: ObstacleTemplate;
}

declare interface ObstacleTemplate {
	render?: SwatchRender[];
	sound?: string;

	static?: boolean; // Whether this obstacle is movable
	angularDamping?: number;
	linearDamping?: number;
	density?: number;

	sensor?: boolean; // Whether other objects (e.g. projectiles) pass through this obstacle
	collideWith?: number;
	expireOn?: number;
	undamageable?: boolean; // Whether projectiles or detonations can damage this obstacle

	health: number;

	hitInterval?: number; // How many ticks between reapplying the buffs
	damage?: number;
	buffs?: BuffTemplate[];
	detonate?: DetonateParameters;
	mirror?: boolean;
	impulse?: number;
	conveyor?: ConveyorParameters;
}

declare interface ConveyorParameters {
	radialSpeed?: number;
	lateralSpeed?: number;
}

declare interface ChoiceSettings {
	Keys: KeyConfig[];
	Options: KeyBindingOptions;
	Special: KeyBindings;
}

declare interface KeyConfig {
	btn: string;
	barSize?: number;
	wheelSize?: number;
}

declare interface Spells {
    [key: string]: Spell;
}

declare type Spell =
	MoveSpell
	| StopSpell
	| RetargetSpell
	| BuffSpell
	| ProjectileSpell
	| ReflectSpell
	| RetractorSpell
	| FocusSpell
	| SaberSpell
	| SpraySpell
	| ScourgeSpell
	| TeleportSpell
	| ThrustSpell
	| WallSpell

declare interface SpellBase {
	id: string;
	name?: string;
    description: string;
	action: string; // Which action function to use
	sound?: string; // Which sound to use for charging/channelling
	untargeted?: boolean; // No target required. i.e. cast instantly when you click the button

	maxAngleDiffInRevs?: number; // How much does the acolyte have to turn to face the target?

	unlink?: boolean; // When this spell is cast, remove any links
	debuff?: boolean; // When this spell is cast, remove all buffs
	throttle?: boolean; // Don't allow throttled spells to be cast too quickly
	chargeTicks?: number; // The number of ticks of charge-up time before casting the spell
	movementProportionWhileCharging?: number; // Proportion of movement to allow during the charge-up time
	movementProportionWhileChannelling?: number; // Proportion of movement to allow during the channelling of the spell
	revsPerTickWhileCharging?: number; // If set, defines how quickly the hero can orient themselves towards the cursor while charging
	revsPerTickWhileChannelling?: number; // If set, defines how quickly the hero can orient themselves towards the cursor while channelling
    cooldown: number;
    interruptibleAfterTicks?: number; // Cannot interrupt a spell until it has been channeling for at least this length
    movementCancel?: boolean; // Whether moving cancels the spell.
	knockbackCancel?: KnockbackCancelParams; // If this spell is being channelled, whether knockback cancels it.
	
	buffs?: BuffTemplate[]

    icon?: string;

    color: string; // The colour of the button for this spell (not the projectile)
}

declare interface KnockbackCancelParams {
	cooldownTicks?: number; // If cancelled by knockback, set cooldown to this value. This can be used to allow the spell to be re-cast quickly if interrupted.
	maxChannelingTicks?: number; // Only apply the cooldown reset if have been channelling for less than this time.
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
	jitterRatio: number; // The spread of the spray. 1.0 means it should go out to 90 degrees either side. Weird units, I know.
}

declare interface RetractorSpell extends SpellBase {
	action: "retractor";
	
	projectile: ProjectileTemplate;

	retractCooldownTicks: number; // Must wait this many ticks before retracting
	retractBehaviours: BehaviourTemplate[]; // Add these behaviours to the projectile when retracted
}

declare interface FocusSpell extends SpellBase {
	action: "focus";
	
	projectile: ProjectileTemplate;
}

declare interface ProjectileTemplate extends DamagePacketTemplate {
	damage: number;
	damageScaling?: boolean; // Whether to apply damage scaling to this projectile
	partialDamage?: PartialDamageParameters;

	density: number;
    radius: number;
	speed: number;
	fixedSpeed?: boolean; // if true or undefined, the projectile's speed will be corrected according to ProjectileSpeedDecayFactorPerTick if it becomes faster or slower due to collisions
	restitution?: number; // 1 means very bouncy, 0 means not bouncy

	strafe?: StrafeParameters; // if true, the projectile will move with the hero's movement
	hitInterval?: number; // If set, the projectile is allowed to hit enemies multiple times, as long as the ticks between hits is at least this number
    bounce?: BounceParameters;
	link?: LinkParameters;
	horcrux?: HorcruxParameters;
	detonate?: DetonateParametersTemplate;
	gravity?: GravityParameters; // Trap a hero
	swapWith?: number; // Category flags of what types of objects to swap with
	lifeSteal?: number; // 1.0 means all damage is returned as health to the owner of the projectile

	buffs?: BuffTemplate[];
	behaviours?: BehaviourTemplate[],

	minTicks?: number; // The minimum number of ticks that a projectile will live for. The main purpose of this is to work around a quirk in the physics engine where if projectiles doesn't live for more than 1 tick, it doesn't affect the physics.
	maxTicks: number; // The maximum number of ticks that a projectile will live for. The maximum range can be determined by speed * maxTicks / TicksPerSecond.
	categories?: number; // Collision flags: What flags this object has
	collideWith?: number; // Collision flags: Which other objects to collide with
	expireOn?: number; // Collision flags: The projectile will expire if it hits any of these objects
	expireAgainstHeroes?: number; // Alliance flags: Whether to expire against enemies only, etc
	expireAgainstObjects?: number; // Alliance flags: Whether to expire against enemies only, etc
	expireOnMirror?: boolean; // Whether to hit mirrors or not
	sensor?: boolean; // A sensor will just pass through all objects and report what it would have collided with
	sense?: number; // Collision flags: Detect when we pass over these objects - different from sensor in that the object can still collide with some things while sensing others
	selfPassthrough?: boolean; // Whether the projectile just passes through its owner
	destructible?: DestructibleParameters; // Whether this projectile is destroyed by a detonate (like a Supernova)
	expireAfterCursorTicks?: number; // Expire this many ticks after the cursor is reached
	shieldTakesOwnership?: boolean; // If the projectile hits a shield, does it switch owner?

	color: string;
	renderers: RenderParams[]; // Which render function to use
	sound?: string;
	soundHit?: string;
}

declare interface StrafeParameters {
	expireOnHeroHit?: boolean; // Whether to lose one of thse projectiles every time the hero is hit
}

declare interface DestructibleParameters {
	against?: number; // who can destroy this projectile?
}

declare interface PartialDamageParameters {
	initialMultiplier: number; // Initially, the projectile initially does this multiplier
	ticks: number; // The projectile grows to full damage when it reaches this lifetime
	step?: boolean; // Grow from initial to full damage at ticks in one step, rather than linear growth
}

declare interface GravityParameters {
	ticks: number; // How long the trap lasts for
	impulsePerTick: number; // Force to apply each tick to a trapped hero (pre-scaling)
	radius: number; // Scale factor: The force scales to zero at this radius
	power: number; // Scale factor: The power curve to apply to the scaling
	render?: RenderSwirl; // What to render when a hero is caught in gravity
}

declare interface BounceParameters {
}

declare interface HorcruxParameters {
}

declare type BehaviourTemplate =
	HomingTemplate
	| AttractTemplate
	| AuraTemplate
	| UpdateCollideWithTemplate
	| ExpireOnOwnerDeathTemplate
	| ExpireOnOwnerRetreatTemplate
	| ExpireOnChannellingEndTemplate

declare type HomingType =
	"self" // Home towards the owner (e.g. for self-orbiting projectiles)
	| "enemy" // Home towards the enemy
	| "cursor" // Home towards where the user initially clicked when they shot this projectile
	| "follow" // Home towards where the user's mouse is right now

declare interface BehaviourTemplateBase {
	type: string;
	trigger?: BehaviourTrigger;
}

declare interface BehaviourTrigger {
	afterTicks?: number; // After this many ticks
	atCursor?: boolean; // When projectile reaches cursor
	minTicks?: number; // Don't trigger at cursor until this many ticks have passed
}

declare interface HomingTemplate extends BehaviourTemplateBase {
	type: "homing";

	targetType?: HomingType; // Whether to home towards "self", "enemy", "cursor" or "follow". Defaults to "enemy".

	revolutionsPerSecond?: number; // The maximum turn rate of the homing projectile. Defaults to infinity
	maxTurnProportion?: number; // The turn rate cannot be more than this proportion of the difference between ideal and current angle. Used to make homing spells dodgeable.

	minDistanceToTarget?: number; // Homing is only applied if the projectile is further than this. Used to keep projectiles orbiting at a particular distance.
	maxDistanceToTarget?: number; // Homing is only applied if the projectile is closer than this.

	newSpeed?: number; // Update the speed of the projectile while we're redirecting it.
	redirect?: boolean; // If true, this homing will only redirect the projectile one time
}

declare interface AttractTemplate extends BehaviourTemplateBase {
	type: "attract";

	against?: number; // Which alliances to attract
	collideLike: number; // Only attract other objects which would collide with this. e.g. collide with them like we're a hero
	categories: number; // What types of objects to attract
	notCategories?: number; // What types of objects to not attract
	radius: number; // Maximum range of attraction
	accelerationPerTick: number; // Acceleration per tick
	maxSpeed?: number; // Slow down anything caught in the attraction
}

declare interface AuraTemplate extends BehaviourTemplateBase {
	type: "aura";

	radius: number; // Maximum range of aura
	tickInterval: number; // Interval between when to apply the buff
	buffs: BuffTemplate[]; // Buffs to apply
}

declare interface UpdateCollideWithTemplate extends BehaviourTemplateBase {
	type: "updateCollideWith";

	collideWith: number;
}

declare interface ExpireOnOwnerDeathTemplate extends BehaviourTemplateBase {
	type: "expireOnOwnerDeath";
}

declare interface ExpireOnOwnerRetreatTemplate extends BehaviourTemplateBase {
	type: "expireOnOwnerRetreat";
	maxDistance: number;
}
declare interface ExpireOnChannellingEndTemplate extends BehaviourTemplateBase {
	type: "expireOnChannellingEnd";
}

declare interface DetonateParameters extends DamagePacketTemplate {
	against?: number;

	radius: number; // The radius of the explosion
	
	minImpulse: number; // The outer rim of the explosion will cause this much knockback
	maxImpulse: number; // The epicenter of the explosion will cause this much knockback

	renderTicks: number; // Length of explosion
	sound?: string;

	buffs?: BuffTemplate[];
}

declare interface DetonateParametersTemplate extends DetonateParameters {
	partialRadius?: PartialDamageParameters; // Scale the radius over time
	partialImpulse?: PartialDamageParameters; // Scale the impulse over time
}

declare type RenderParams =
	RenderRay
	| RenderProjectile
	| RenderPolygon
	| RenderSwirl
	| RenderLink
	| RenderReticule
	| RenderStrike

declare interface RenderParamsBase {
	type: string;
}

declare interface ProjectileColorParams {
    color?: string; // Override the color of the projectile
	selfColor?: boolean; // Give the projectile the owner's colour, so they can tell it's theirs
	ownerColor?: boolean; // Whether to color the same as the owner for other people
}

declare interface RenderRay extends RenderParamsBase, ProjectileColorParams {
	type: "ray";
	intermediatePoints?: boolean; // A ray might be so fast that we need to render the subtick that it made contact, otherwise it doesn't look like it touched the other object at all

	ticks: number; // How long is the trail?
	glow?: number;
	noPartialRadius?: boolean;
	radiusMultiplier?: number;
}

declare interface RenderProjectile extends RenderParamsBase, ProjectileColorParams {
	type: "projectile";

	ticks: number; // How long is the trail?
	fade?: string;
	smoke?: number;
	glow?: number;
	noPartialRadius?: boolean;
	radiusMultiplier?: number;
}

declare interface RenderPolygon extends RenderParamsBase, ProjectileColorParams {
	type: "polygon";

	numPoints: number;
	ticks: number;
	revolutionInterval: number;
	fade?: string;
	smoke?: number;
	glow?: number;
	noPartialRadius?: boolean;
	radiusMultiplier?: number;
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

	smoke?: number;
	fade?: string;
	glow?: number;
}

declare interface RenderLink extends RenderParamsBase {
	type: "link";
	color: string;
	width: number;
	glow?: number;
}

declare interface RenderReticule extends RenderParamsBase {
	type: "reticule";
	color: string;
	remainingTicks?: number; // Only display when this many ticks remaining
	shrinkTicks?: number;
	grow?: boolean;
	fade?: boolean;
	startingTicks?: number; // Only display for this many ticks since creation of the projectile
	repeat?: boolean; // Whether to repeatedly show the reticule shrinking
	minRadius: number;
	radius: number;
	usePartialDamageMultiplier?: boolean;
	glow?: boolean;
}

declare interface RenderStrike extends RenderParamsBase, ProjectileColorParams {
	type: "strike";
	ticks: number;
	glow?: boolean;
	growth?: number;
	numParticles?: number;
	speedMultiplier?: number;
}

declare type BuffTemplate =
	DebuffTemplate
	| MovementBuffTemplate
	| GlideTemplate
	| LavaImmunityBuffTemplate
	| VanishTemplate
	| LifestealTemplate
	| SetCooldownTemplate
	| BurnTemplate
	| ArmorTemplate

declare interface BuffTemplateBase {
	type: string;
	owner?: boolean; // If this is a projectile that hit, apply the buff to the owner, not to the target
	against?: number; // Which alliances to apply this buff to
	maxTicks?: number;
	channelling?: boolean; // Cancel this buff if the hero stops casting the spell
	cancelOnHit?: boolean; // Cancel this buff if the hero gets hit
	render?: RenderBuff;
	sound?: string;
}

declare interface RenderBuff {
	color: string;
	alpha?: number;
	heroColor?: boolean;
	decay?: boolean;
	emissionRadiusFactor?: number; // 1 means smoke comes from the edges of the hero, 0 means it comes from the center
	particleRadius: number;
	ticks: number;
}

declare interface DebuffTemplate extends BuffTemplateBase {
	type: "debuff";
}

declare interface MovementBuffTemplate extends BuffTemplateBase {
	type: "movement";
	movementProportion: number; // 0 will make the hero unable to move, 2 will make hero movenet twice as fast
}

declare interface GlideTemplate extends BuffTemplateBase {
	type: "glide";
	linearDampingMultiplier: number; // 0 will make the hero glide
}

declare interface LavaImmunityBuffTemplate extends BuffTemplateBase {
	type: "lavaImmunity";
	damageProportion: number; // 0 will make the hero immune to void damage
}

declare interface VanishTemplate extends BuffTemplateBase {
	type: "vanish";
}

declare interface LifestealTemplate extends BuffTemplateBase {
	type: "lifeSteal";
	lifeSteal: number;
	targetOnly?: boolean;
}

declare interface SetCooldownTemplate extends BuffTemplateBase {
	type: "cooldown";
	spellId?: string;
	minCooldown?: number;
	maxCooldown?: number;
	color?: string;
}

declare interface BurnTemplate extends BuffTemplateBase {
	type: "burn";
	hitInterval: number;
	packet: DamagePacketTemplate;
	stack?: string;
}

declare interface ArmorTemplate extends BuffTemplateBase {
	type: "armor";
	proportion: number; // Positive increases damage received, negative negates damage received
	ownerOnly?: boolean; // If this armor is received by a projectile, only apply the armor to further damage received from the owner of the projectile
	targetOnly?: boolean;
}

declare interface BuffSpell extends SpellBase {
    action: "buff";

	buffs: BuffTemplate[];
}

declare interface ScourgeSpell extends SpellBase {
    action: "scourge";

	selfDamage: number;
	minSelfHealth: number;

	detonate: DetonateParameters;

    trailTicks: number;
}

declare interface ShieldSpell extends SpellBase {
	maxTicks: number;
	takesOwnership: boolean;
	blocksTeleporters: boolean;
	glow?: number;
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

declare interface SaberSpell extends ShieldSpell {
	action: "saber";

	shiftMultiplier: number; // Move object by this proportion of the swing (ensures it doesn't get caught in the swing next tick and ends up sticking to the saber)
	speedMultiplier: number; // Accelerate object to the speed of the swing multiplied by this factor
	maxSpeed: number; // The maximum speed the saber can accelerate an object to
	maxTurnRatePerTickInRevs: number; // THe maximum speed the saber can be swung

	angleOffsetsInRevs: number[];
	length: number;
	width: number;

	maxTicks: number;

	categories: number;
	collidesWith: number;

	trailTicks: number;
}

declare interface TeleportSpell extends SpellBase {
	action: "teleport";
	range: number;
}

declare interface ThrustSpell extends SpellBase {
    action: "thrust";

	range: number;
	radiusMultiplier: number;
	bounceTicks: number; // If a hero crashes into something with thrust, the number of ticks they will bounce off for before coming to a stop
	speed: number;

	damageTemplate: DamagePacketTemplate;
}

declare interface KeyBindingOptions {
    [key: string]: string[][];
}

declare interface KeyBindings {
    [key: string]: string;
}

declare interface LinkParameters {
	linkWith: number; // Categories of object to link to

	selfFactor?: number; // How much should the link pull the hero
	targetFactor?: number; // How much should the link pull the target

	impulsePerTick: number;
	linkTicks: number;
	minDistance: number;
	maxDistance: number;

	movementProportion?: number; // Speed up/slow down movement while link is attached

	render?: RenderLink;
}

declare interface DamagePacketTemplate {
	damage: number;
	damageScaling?: boolean;
	lifeSteal?: number;
	isLava?: boolean;
	noHit?: boolean; // Don't count this as a hit - no hero flashing and no halo stripping
	minHealth?: number; // Never reduce the enemy below this level of health
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

	intensityUpdateFactor?: number; // The rate at which the volume is adjusted to match intensity
	intensityDelay?: number; // The speed at which the volume changes to the new intensity

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
	starting: boolean; // Whether spells are allowed to be cast yet
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
	alliance: number;
	health: number; // The current health of the hero (out of 100)
	heading: Vec2; // A unit vector representing the direction the Hero is currently facing
	radius: number; // The radius of the hero
	inside: boolean; // Whether the unit in inside or outside the confines of the map
	linkedToId?: string; // If set, this Hero currently has trapped another Hero in a link. This is the ID of the other Hero (the "victim").
	casting?: CastingContract; // If set, currently casting a channelled spell
	shieldTicksRemaining: number; // The number of ticks that the hero will continue to be shielded for, 0 if unshielded
}

declare interface ProjectileContract extends WorldObjectContract {
	ownerId: string;
	spellId: string;

	radius: number;
}

declare interface CastingContract {
	spellId: string;
}

declare interface CooldownsRemainingContract {
	[spellId: string]: number;
}

declare interface ObstacleContract extends WorldObjectContract {
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