import * as pl from 'planck-js';

export interface Spells {
    [key: string]: Spell;
}

export type Spell = MoveSpell | ProjectileSpell | SpraySpell | ScourgeSpell | ShieldSpell | TeleportSpell | ThrustSpell;

export interface SpellBase {
    id: string;
    description: string;
    action: string;

    maxAngleDiff?: number;

    chargeTicks?: number;
    cooldown: number;
    uninterruptible?: boolean;
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
	fireTowardsCurrentHeading?: boolean;
}

export interface SpraySpell extends SpellBase {
    action: "spray";

    projectile: ProjectileTemplate;

    intervalTicks: number;
    lengthTicks: number;

    jitterRatio: number;
}

export interface ProjectileTemplate {
    damage: number;
    bounce?: BounceParameters;

    density: number;
    radius: number;
	speed: number;
	maxSpeed?: number;

    homing?: HomingParametersTemplate;
	link?: LinkParametersTemplate;
	gravity?: GravityParameters;
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
	turnRate: number;
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
}

export interface LinkParametersTemplate {
    strength: number;
    linkTicks: number;
}

export interface ScourgeSpell extends SpellBase {
    action: "scourge";

    damage: number;
    selfDamage: number;

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
	destroyed: WorldObject[];
	events: WorldEvent[];

	physics: pl.World;

	radius: number;

	occurrences: Occurrence[];
	actions: Map<string, Action>,

	nextObstacleId: number;
	nextPositionId: number;
	nextBulletId: number;
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

	trails: Trail[];

	notifications: Notification[];
}

export interface Player {
	heroId: string;
	name: string;
	uiColor: string; // Not synced across clients
}

export type Notification =
	HelpNotification 
	| ServerStatsNotification
	| JoinNotification 
	| LeaveNotification 
	| KillNotification 
	| NewGameNotification
	| CloseGameNotification
	| WinNotification
	| DisconnectedNotification;

export interface HelpNotification {
	type: "help";
}

export interface ServerStatsNotification {
	type: "serverStats";
	numGames: number;
	numPlayers: number;
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

export interface DisconnectedNotification {
	type: "disconnected";
}

export type Occurrence = Joining | Leaving | EnvironmentSeed;

export interface EnvironmentSeed {
	type: "environment";
	seed: number;
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
	type: string;
	body: pl.Body;
	destroyed?: boolean;
}

export interface Obstacle extends WorldObjectBase {
	category: "obstacle";
	maxHealth: number;
	health: number;
	extent: number;
	points: pl.Vec2[];
}

export interface Hero extends WorldObjectBase {
	category: "hero";
	type: "hero";

	health: number;
	body: pl.Body;
	massOverride?: number;
	casting: CastState | null;
	cooldowns: Cooldowns;
	shieldTicks?: number;
	thrust?: ThrustState;

	hitTick: number;

	killerHeroId: string | null;
	assistHeroId: string | null;

	keysToSpells: Map<string, string>;
	spellsToKeys: Map<string, string>;
}

export interface CastState {
	action: Action;
	stage: number;
	uninterruptible?: boolean;

	chargeStartTick?: number;
	channellingStartTick?: number;

	proportion?: number;
	color?: string;
}

export interface ThrustState {
	velocity: pl.Vec2;
	ticks: number;
	nullified: boolean;
	alreadyHit: Set<string>;
}

export interface Cooldowns {
	[spellId: string]: number;
}

export interface Projectile extends WorldObjectBase {
	category: "projectile";

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
	redirectionTick: number | null;
	speedWhenClose: number;
}

export interface LinkParameters {
	targetId: string | null;
	strength: number;
	linkTicks: number;
}

export type WorldObject = Hero | Projectile | Obstacle;

export type WorldEvent = ScourgeEvent;

export interface WorldEventBase {
	type: string;
}

export interface ScourgeEvent extends WorldEventBase {
	type: "scourge";
	pos: pl.Vec2;
	heroId: string;
}

export namespace WorldEventType {
	export const HeroDeath = "heroDeath";
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