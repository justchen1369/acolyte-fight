import * as pl from 'planck-js';

export interface Spells {
    [key: string]: Spell;
}

export type Spell =
	MoveSpell
	| ProjectileSpell
	| SpraySpell
	| ScourgeSpell
	| ShieldSpell
	| TeleportSpell
	| ThrustSpell
	| WallSpell;

export interface SpellBase {
	id: string;
	name?: string;
    description: string;
	action: string;
	untargeted?: boolean;

    maxAngleDiff?: number;

    chargeTicks?: number;
    cooldown: number;
    interruptible?: boolean;
    knockbackCancel?: boolean;

    icon?: string;

    color: string;
}

export interface MoveSpell extends SpellBase {
    action: "move";
}

export interface ProjectileSpell extends SpellBase {
    action: "projectile";

	projectile: ProjectileTemplate;
}

export interface SpraySpell extends SpellBase {
    action: "spray";

    projectile: ProjectileTemplate;

    intervalTicks: number;
    lengthTicks: number;

    jitterRatio: number;
}

export interface WallSpell extends SpellBase {
	action: "wall";

	maxRange: number;

	length: number;
	width: number;

	health: number;
	maxTicks: number;
}

export interface ProjectileTemplate extends DamagePacket {
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

export interface GravityParameters {
	strength: number;
	ticks: number;
	radius: number;
	power: number;
}

export interface BounceParameters {
    damageFactor: number;
}

export interface HomingParametersTemplate {
	minDistanceToTarget?: number;
	speedWhenClose?: number;
	turnRate: number;
	maxTurnProportion?: number;
    targetType?: string;
	redirect?: boolean;
	afterTicks?: number;
}

export interface DetonateParametersTemplate {
	radius: number;
	minImpulse: number;
	maxImpulse: number;
	waitTicks?: number;
}

export interface ScourgeSpell extends SpellBase {
    action: "scourge";

    damage: number;
	selfDamage: number;
	damageScaling?: boolean;

    radius: number;

    minImpulse: number;
    maxImpulse: number;

    trailTicks: number;
}

export interface ShieldSpell extends SpellBase {
    action: "shield";

    mass: number;
    maxTicks: number;
    radius: number;
}

export interface TeleportSpell extends SpellBase {
    action: "teleport";

    maxRange: number;
}

export interface ThrustSpell extends SpellBase {
    action: "thrust";

	damage: number;
	damageScaling?: boolean;
    maxTicks: number;
    speed: number;
}

export interface Layout {
	obstacles: ObstacleTemplate[];
}

export interface ObstacleTemplate {
	// Where to place the obstacles
	numObstacles: number;
	layoutRadius: number;
	layoutAngleOffset: number;

	// Properties of an individual obstacle
	numPoints: number;
	extent: number;
	orientationAngleOffset: number;
}

export interface KeyBindingOptions {
    [key: string]: string[];
}

export interface KeyBindings {
    [key: string]: string;
}

export namespace CastStage {
	export const Cooldown = 1;
	export const Orientating = 2;
	export const Charging = 3;
	export const Channelling = 4;
	export const Complete = 5;
}

export interface World {
	seed: number | null;
	tick: number;
	startTick: number;

	activePlayers: Set<string>;
	players: Map<string, Player>;
	scores: Map<string, HeroScore>;
	winner: string | null;

	objects: Map<string, WorldObject>,

	physics: pl.World;

	radius: number;

	occurrences: Occurrence[];
	actions: Map<string, Action>,

	nextPositionId: number;
	nextObjectId: number;
	nextColorId: number;
	
	ui: UIState; // Temporary data which is visual-only and does not need to sync
};

export interface HeroScore {
	heroId: string;
	kills: number;
	assists: number;
	damage: number;

	numFireballsShot: number;
	numFireballsHit: number;
	
	deathTick: number | null;
}

export interface UIState {
	myGameId: string | null;
	myHeroId: string | null;
	nextSpellId?: string;
	renderedTick: number | null;

	destroyed: WorldObject[];
	events: WorldEvent[];

	trails: Trail[];
	notifications: Notification[];

	buttonBar?: ButtonConfig;
}

export interface ButtonConfig {
	buttons: Map<string, ButtonRenderState>;
	hitBoxes: Map<string, ClientRect>;
	region: ClientRect;
	scaleFactor: number;
	vertical: boolean;
}

export interface Player {
	heroId: string;
	name: string;
	uiColor: string; // Not synced across clients
}

export interface ButtonRenderState {
	key: string;
	color: string;
	icon: string;
	cooldownText: string;
}

export type Notification =
	HelpNotification 
	| JoinNotification 
	| LeaveNotification 
	| QuitNotification
	| KillNotification 
	| NewGameNotification
	| CloseGameNotification
	| WinNotification
	| DisconnectedNotification
	| ReplayNotFoundNotification;

export interface HelpNotification {
	type: "help";
}

export interface JoinNotification {
	type: "join";
	player: Player;
}

export interface LeaveNotification {
	type: "leave";
	player: Player;
}

export interface KillNotification {
	type: "kill";
	killed: Player;
	killer: Player | null;
	assist: Player | null;
}

export interface NewGameNotification {
	type: "new";
	gameId: string;
	heroId: string;
	room: string | null;
	numGames: number;
	numPlayers: number;
}

export interface CloseGameNotification {
	type: "closing";
	ticksUntilClose: number;
}

export interface WinNotification {
	type: "win";
	winner: Player;

	mostDamage: Player;
	mostDamageAmount: number;

	mostKills: Player;
	mostKillsCount: number;
}

export interface QuitNotification {
	type: "quit";
}

export interface DisconnectedNotification {
	type: "disconnected";
}

export interface ReplayNotFoundNotification {
	type: "replayNotFound";
}

export type Occurrence = Closing | Joining | Leaving | EnvironmentSeed;

export interface EnvironmentSeed {
	type: "environment";
	seed: number;
}

export interface Closing {
	type: "closing";
	startTick: number;
}

export interface Joining {
	type: "join";
	heroId: string;
	playerName: string;
	keyBindings: KeyBindings;
	preferredColor: string | null;
}

export interface Leaving {
	type: "leave";
	heroId: string;
}

export interface WorldObjectBase {
	id: string;
	category: string;
	categories: number;
	body: pl.Body;
	destroyed?: boolean;
}

export interface Obstacle extends WorldObjectBase {
	category: "obstacle";
	type: string;

	maxHealth: number;
	health: number;
	createTick: number;
	growthTicks: number;
	damagePerTick: number;
	extent: number;
	points: pl.Vec2[];
}

export interface Hero extends WorldObjectBase {
	category: "hero";
	filterGroupIndex: number;

	health: number;
	body: pl.Body;
	casting: CastState | null;
	cooldowns: Cooldowns;
	link?: LinkState;
	thrust?: ThrustState;
	gravity?: GravityState;

	killerHeroId: string | null;
	assistHeroId: string | null;

	keysToSpells: Map<string, string>;
	spellsToKeys: Map<string, string>;
}

export interface Shield extends WorldObjectBase {
	category: "shield";
	expireTick: number;
	owner: string;
}

export interface CastState {
	action: Action;
	stage: number;
	uninterruptible?: boolean;

	chargeStartTick?: number;
	channellingStartTick?: number;
	initialPosition?: pl.Vec2;
	initialAngle?: number;

	proportion?: number;
	color?: string;
}

export interface LinkState {
	targetId: string | null;
	strength: number;
	lifeSteal: number;
	expireTick: number;
}

export interface ThrustState extends DamagePacket {
	damage: number;
	velocity: pl.Vec2;
	ticks: number;
	nullified: boolean;
	alreadyHit: Set<string>;
}

export interface GravityState {
	expireTick: number;
	location: pl.Vec2;
	strength: number;
	radius: number;
	power: number;
}

export interface Cooldowns {
	[spellId: string]: number;
}

export interface Projectile extends WorldObjectBase, DamagePacket {
	category: "projectile";
	type: string;

	owner: string;
	body: pl.Body;
	collideWith: number;
	hit?: boolean;
	maxSpeed: number | null;

	target: pl.Vec2;
	targetId: string | null;
	alreadyHit: Set<string>;

	damage: number;
	bounce?: BounceParameters;
	gravity?: GravityParameters;
	homing?: HomingParameters;
	link?: LinkParameters;
	detonate?: DetonateParameters;
	lifeSteal: number;
	shieldTakesOwnership: boolean;

	createTick: number;
	expireTick: number;
	maxTicks: number;
	explodeOn: number;

	render: string;
    radius: number;
	color: string;
	selfColor: boolean;
    trailTicks: number;

	uiPath: pl.Vec2[]; // is only used for the UI and not guaranteed to be sync'd across clients!
}

export interface DetonateParameters {
	radius: number;
	minImpulse: number;
	maxImpulse: number;
	detonateTick: number;
	waitTicks: number;
}

export namespace HomingTargets {
	export const enemy = "enemy";
	export const self = "self";
	export const cursor = "cursor";
}

export interface HomingParameters {
	turnRate: number;
	maxTurnProportion: number;
	minDistanceToTarget: number;
	targetType: string;
	afterTick: number;
	redirectionTick: number | null;
	speedWhenClose: number;
}

export interface LinkParameters {
	strength: number;
	lifeSteal: number;
	linkTicks: number;
}

export interface DamagePacket {
	damage: number;
	lifeSteal?: number;
}

export type WorldObject =
	Hero
	| Shield
	| Projectile
	| Obstacle;

export type WorldEvent =
	DetonateEvent
	| ScourgeEvent;

export interface WorldEventBase {
	type: string;
}

export interface DetonateEvent extends WorldEventBase {
	type: "detonate";
	pos: pl.Vec2;
	radius: number;
}

export interface ScourgeEvent extends WorldEventBase {
	type: "scourge";
	pos: pl.Vec2;
	heroId: string;
}

export namespace WorldEventType {
	export const Detonate = "detonate";
	export const Scourge = "scourge";
} 

export interface Action {
	type: string;
	target?: pl.Vec2;
}

export type Trail = CircleTrail | LineTrail;

export interface TrailBase {
	initialTick: number;
	max: number;
	fillStyle: string;
}

export interface CircleTrail extends TrailBase {
	type: "circle";
	pos: pl.Vec2;
	radius: number;
}

export interface LineTrail extends TrailBase {
	type: "line";
	from: pl.Vec2;
	to: pl.Vec2;
	width: number;
}