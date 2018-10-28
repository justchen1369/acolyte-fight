import moment from 'moment';
import pl from 'planck-js';
import * as Immutable from 'immutable';

export namespace Actions {
	export const Move = "move";
	export const MoveAndCancel = "go";
	export const Retarget = "retarget";
	export const Stop = "stop";

	export const NonGameStarters = [Move, MoveAndCancel, Retarget];
}

export namespace SpecialKeys {
	export const Hover = "hover";
	export const Retarget = "retarget";
	export const Move = "move";
	export const LeftClick = "primary";
	export const RightClick = "dash";
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

	activePlayers: Immutable.Set<string>; // Set<heroId: string>
	players: Immutable.Map<string, Player>; // heroId -> Player
	scores: Immutable.Map<string, HeroScore>; // heroId -> HeroScore
	winner: string | null;
	winTick?: number;

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
	createTime: moment.Moment;

	myGameId: string | null;
	myHeroId: string | null;
	myPartyId: string | null;

	nextTarget?: pl.Vec2;
	nextSpellId?: string;
	hoverSpellId?: string;
	renderedTick: number | null;

	destroyed: WorldObject[];
	events: WorldEvent[];

	trails: Trail[];
	notifications: Notification[];

	buttonBar?: ButtonConfig;

	saved?: boolean;
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
	userId?: string;
	userHash: string | null;
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
	| TextNotification
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

export interface TextNotification {
	type: "text";
	player: Player;
	text: string;
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
	isPrivate: boolean;
	numPlayersPublic: number;
	numPlayersInGameMode: number;
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

export type Occurrence = Closing | Botting | Joining | Leaving | EnvironmentSeed | Texting;

export interface EnvironmentSeed {
	type: "environment";
	seed: number;
}

export interface Texting {
	type: "text";
	heroId: string;
	text: string;
}

export interface Closing {
	type: "closing";
	startTick: number;
	ticksUntilClose: number;
}

export interface Joining {
	type: "join";
	userId?: string;
	userHash: string | null;
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
	blocksTeleporters?: boolean;
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

	hitTick?: number;
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
	damagedTick?: number;

	additionalDamagePower: number;
	additionalDamageMultiplier: number;

	moveTo?: pl.Vec2;
	target?: pl.Vec2;
	casting: CastState | null;
	cooldowns: Cooldowns;
	charges: Cooldowns;

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

export interface ShieldBase extends WorldObjectBase {
	category: "shield";
	type: string;
	createTick: number;
	expireTick: number;
	growthTicks: number;
	takesOwnership: boolean;
	owner: string;
	color: string;
	selfColor?: boolean;
	hitTick?: number;
}

export interface Reflect extends ShieldBase {
	type: "reflect";
	radius: number;
}

export interface Wall extends ShieldBase {
	type: "wall";
	extent: number;
	points: pl.Vec2[];
}

export type Shield = Reflect | Wall;

export interface CastState {
	action: Action;
	stage: number;
	uninterruptible?: boolean;
	movementProportion?: number;

	chargeStartTick?: number;
	channellingStartTick?: number;
	initialPosition?: pl.Vec2;

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
	passthrough: boolean;
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

export interface DetonateParameters extends DamagePacket {
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
	| ScourgeEvent
	| LifeStealEvent;

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

export interface LifeStealEvent extends WorldEventBase {
	type: "lifeSteal";
	owner: string;
}

export interface Action {
	type: string;
	target: pl.Vec2;
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