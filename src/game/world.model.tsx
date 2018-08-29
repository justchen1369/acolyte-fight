import * as pl from 'planck-js';
import * as Immutable from 'immutable';

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

	activePlayers: Immutable.Set<string>; // Set<heroId: string>
	players: Immutable.Map<string, Player>; // heroId -> Player
	scores: Immutable.Map<string, HeroScore>; // heroId -> HeroScore
	winner: string | null;

	objects: Map<string, WorldObject>,

	physics: pl.World;

	radius: number;

	occurrences: Occurrence[];
	actions: Map<string, Action>,

	nextPositionId: number;
	nextObjectId: number;
	nextColorId: number;
	
	settings: AcolyteFightSettings;
	mod: Object;
	allowBots: boolean;

	ui: UIState; // Temporary data which is visual-only and does not need to sync
};

export interface HeroScore {
	heroId: string;
	kills: number;
	assists: number;
	damage: number;

	deathTick: number | null;
}

export interface UIState {
	myGameId: string | null;
	myHeroId: string | null;
	nextTarget?: pl.Vec2;
	nextSpellId?: string;
	renderedTick: number | null;

	destroyed: WorldObject[];
	events: WorldEvent[];

	trails: Trail[];
	notifications: Notification[];

	buttonBar?: ButtonConfig;
}

export type ButtonConfig = ButtonBarConfig | ButtonWheelConfig;

export interface ButtonBarConfig {
	view: "bar";
	region: ClientRect;
	scaleFactor: number;

	hitBoxes: Map<string, ClientRect>;

	buttons: Map<string, ButtonRenderState>;
}

export interface ButtonWheelConfig {
	view: "wheel";
	region: ClientRect;

	center: pl.Vec2;
	hitSectors: Map<string, HitSector>;
	innerRadius: number;
	outerRadius: number;

	targetSurfaceCenter: pl.Vec2;

	buttons: Map<string, ButtonRenderState>;
}

export interface HitSector {
	startAngle: number;
	endAngle: number;
}

export interface Player {
	heroId: string;
	name: string;
	uiColor: string; // Not synced across clients
	isSharedBot: boolean; // Not synced across clients
	isBot: boolean;
	isMobile: boolean;
}

export interface ButtonRenderState {
	key: string;
	color: string;
	icon: string;
	cooldownText: string;
}

export type Notification =
	HelpNotification 
	| RoomNotification
	| JoinNotification 
	| BotNotification 
	| LeaveNotification 
	| KillNotification 
	| NewGameNotification
	| CloseGameNotification
	| WinNotification
	| DisconnectedNotification
	| ReplayNotFoundNotification;

export interface HelpNotification {
	type: "help";
}

export interface RoomNotification {
	type: "room";
	roomId: string;
}

export interface JoinNotification {
	type: "join";
	player: Player;
}

export interface BotNotification {
	type: "bot";
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

export interface DisconnectedNotification {
	type: "disconnected";
}

export interface ReplayNotFoundNotification {
	type: "replayNotFound";
}

export interface PartyMemberState {
	socketId: string;
	name: string;
	ready: boolean;
}

export type Occurrence = Closing | Botting | Joining | Leaving | EnvironmentSeed;

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
	isBot: boolean;
	isMobile: boolean;
}

export interface Botting {
	type: "botting";
	heroId: string;
	keyBindings: KeyBindings;
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
	maxHealth: number;
	body: pl.Body;
	radius: number;
	moveSpeedPerSecond: number;
	revolutionsPerTick: number;

	additionalDamagePower: number;
	additionalDamageMultiplier: number;

	casting: CastState | null;
	cooldowns: Cooldowns;

	shieldIds: Set<string>; // Will keep pointing at shield after it is gone
	strafeIds: Set<string>; // Will keep pointing at projectiles after they are gone

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
	radius: number;
	createTick: number;
	expireTick: number;
	owner: string;
	color: string;
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

	uiScale?: number;
}

export interface LinkState {
	targetId: string | null;

	strength: number;
	minDistance: number;
	maxDistance: number;

	lifeSteal: number;
	expireTick: number;
	color: string;
}

export interface ThrustState extends DamagePacket {
	damage: number;
	velocity: pl.Vec2;
	ticks: number;
	nullified: boolean;
	alreadyHit: Set<string>;
}

export interface GravityState {
	spellId: string;
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
	speed: number;
	fixedSpeed: boolean;
	strafe?: boolean;

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
	minTicks: number;
	maxTicks: number;
	expireOn: number;

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
	afterTick: number;
	redirectionTick: number | null;
	speedWhenClose: number;
}

export interface DetonateParameters {
	radius: number;
	minImpulse: number;
	maxImpulse: number;
	detonateTick: number;
	waitTicks: number;
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
	radius: number;
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