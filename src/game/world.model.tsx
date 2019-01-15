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
	export const SingleTap = "single";
	export const DoubleTap = "double";
	export const WheelCenter = "center";
}

export namespace CastStage {
	export const Cooldown = 1;
	export const Throttle = 2;
	export const Orientating = 3;
	export const Charging = 4;
	export const Channelling = 5;
	export const Complete = 6;
}

export interface World {
	seed: number | null;
	tick: number;
	startTick: number;

	activePlayers: Immutable.Set<string>; // Set<heroId: string>
	players: Immutable.Map<string, Player>; // heroId -> Player
	scores: Immutable.Map<string, HeroScore>; // heroId -> HeroScore
	teams: Immutable.Map<string, string>; // heroId -> teamId
	winner: string | null; // heroId
	winners: string[] | null;
	winTick?: number;

	objects: Map<string, WorldObject>,
	behaviours: Behaviour[],

	physics: pl.World;

	mapPoints?: pl.Vec2[];
	mapRadiusMultiplier: number;
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
	rank: number | null;
}

export interface UIState {
	createTime: moment.Moment;

	myGameId: string | null;
	myHeroId: string | null;
	myPartyId: string | null;
	reconnectKey: string | null;

	nextTarget?: pl.Vec2;
	nextSpellId?: string;
	hoverSpellId?: string;
	renderedTick: number | null;
	playedTick: number;

	destroyed: WorldObject[];
	events: WorldEvent[];

	trails: Trail[];
	notifications: Notification[];
	sounds: AudioElement[];

	buttonBar?: ButtonConfig;
	hoverBtn?: string;
	customizingBtn?: string;

	saved?: boolean;
}

export type ButtonConfig = ButtonBarConfig | ButtonWheelConfig;

export interface ButtonBarConfig {
	view: "bar";
	region: ClientRect;
	scaleFactor: number;

	keys: KeyConfig[];
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
	weight: number;
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
	dead?: boolean;
}

export interface ButtonRenderState {
	key: string;
	color: string;
	icon: string;
	cooldownText: string;
}

export type Notification =
	HelpNotification 
	| ExitNotification
	| TextNotification
	| JoinNotification 
	| BotNotification 
	| LeaveNotification 
	| KillNotification 
	| NewGameNotification
	| CloseGameNotification
	| WinNotification
	| DisconnectedNotification
	| RatingAdjustmentNotification

export interface HelpNotification {
	type: "help";
}

export interface ExitNotification {
	type: "exit";
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
	myHeroId: string;
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
	myHeroId: string;
	winner: Player;

	mostDamage: Player;
	mostDamageAmount: number;

	mostKills: Player;
	mostKillsCount: number;
}

export interface DisconnectedNotification {
	type: "disconnected";
}

export interface RatingAdjustmentNotification {
	type: "ratingAdjustment";
	gameId: string;
	ratingDelta: number;
	acoDelta: number;
	category: string;
}

export type Occurrence = Closing | Botting | Joining | Leaving | EnvironmentSeed | Texting | ChoosingSpells;

export interface EnvironmentSeed {
	type: "environment";
	seed: number;
	layoutId?: string;
}

export interface ChoosingSpells {
	type: "spells";
	heroId: string;
	keyBindings: KeyBindings;
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
	numTeams?: number;
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
	extent: number;
	points: pl.Vec2[];

	damagedTick?: number;
	lavaTick?: number;
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
	hitTick?: number;
	damagedTick?: number;
	lavaTick?: number;

	damageSources: Map<string, number>;
	damageSourceHistory: DamageSourceHistoryItem[];

	moveTo?: pl.Vec2;
	target?: pl.Vec2;
	casting: CastState | null;
	cooldowns: Cooldowns;
	throttleUntilTick: number;

	shieldIds: Set<string>; // Will keep pointing at shield after it is gone
	strafeIds: Set<string>; // Will keep pointing at projectiles after they are gone
	retractorIds: Map<string, string>; // spellId -> projectile id. Will keep pointing at projectiles after they are gone

	link?: LinkState;
	thrust?: ThrustState;
	gravity?: GravityState;
	buffs: Map<string, Buff>;

	killerHeroId: string | null;
	assistHeroId: string | null;

	keysToSpells: Map<string, string>;
	spellsToKeys: Map<string, string>;
}

export interface DamageSourceHistoryItem {
	heroId: string;
	amount: number;
	expireTick: number;
}

export interface ShieldBase extends WorldObjectBase {
	category: "shield";
	type: string;
	sound?: string;
	createTick: number;
	expireTick: number;
	growthTicks: number;
	takesOwnership: boolean;
	owner: string;
	color: string;
	selfColor?: boolean;
	hitTick?: number;
	glow?: boolean;
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

export interface Saber extends ShieldBase {
	type: "saber";

	spellId: string;

	length: number;
	width: number;

	points: pl.Vec2[];

	shiftMultiplier: number;
	speedMultiplier: number;
	maxSpeed: number;

	turnRate: number;

	trailTicks: number;
	uiPreviousAngle: number;
}


export type Shield = Reflect | Wall | Saber;

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
}

export interface ThrustState {
	damageTemplate: DamagePacketTemplate;
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

export type Buff =
	MovementBuff
	| LavaImmunityBuff;

export interface BuffBase {
	id: string;
	type: string;
	expireTick: number;
}

export interface MovementBuff extends BuffBase {
	type: "movement";
	movementProportion: number;
}

export interface LavaImmunityBuff extends BuffBase {
	type: "lavaImmunity";
	damageProportion: number;
	sound?: string;
	maxTicks: number;
}

export interface Cooldowns {
	[spellId: string]: number;
}

export interface Projectile extends WorldObjectBase {
	category: "projectile";
	type: string;

	owner: string;
	body: pl.Body;
	collideWith: number;
	collidedTick?: number;
	hit?: number;

	speed: number;
	fixedSpeed: boolean;
	strafe?: StrafeParameters;

	target: pl.Vec2;
	targetId: string | null;
	hitInterval?: number;
	hitTick: Map<string, number>; // object id -> tick

	damageTemplate: DamagePacketTemplate;
	partialDamage?: PartialDamageParameters;
	bounce?: BounceParameters;
	gravity?: GravityParameters;
	link?: LinkParameters;
	detonate?: DetonateParameters;
	buffs?: BuffTemplate[];
	swapWith?: number;
	shieldTakesOwnership: boolean;

	createTick: number;
	expireTick: number;
	minTicks: number;
	maxTicks: number;
	expireOn: number;
	expireAgainstHeroes: number;
	expireAgainstObjects: number;
	destructible?: DestructibleParameters;

	renderers: RenderParams[];
	sound?: string;
	soundHit?: string;
    radius: number;

	uiPath: pl.Vec2[]; // is only used for the UI and not guaranteed to be sync'd across clients!
}

export interface DamagePacket {
	fromHeroId: string;
	damage: number;
	lifeSteal: number;
	lifeStealTargetHeroId?: string;
	isLava?: boolean;
}

export namespace HomingTargets {
	export const enemy = "enemy";
	export const self = "self";
	export const cursor = "cursor";
}

export type Behaviour =
	DelayBehaviour
	| HomingBehaviour
	| DetonateBehaviour
	| RetractorBehaviour
	| RemovePassthroughBehaviour
	| UpdateCollideWithBehaviour
	| LinkBehaviour
	| GravityBehaviour
	| ReflectFollowBehaviour
	| ThrustBounceBehaviour
	| ThrustDecayBehaviour
	| SaberBehaviour
	| ExpireBuffsBehaviour
	| ExpireOnOwnerDeathBehaviour

export interface BehaviourBase {
	type: string;
}

export interface DelayBehaviour extends BehaviourBase {
	type: "delayBehaviour";
	afterTick: number;
	delayed: Behaviour;
}

export interface HomingBehaviour extends BehaviourBase {
	type: "homing";
	targetType: HomingType;

	projectileId: string;

	turnRate: number;
	maxTurnProportion: number;
	minDistanceToTarget: number;

	redirect?: boolean;
	newSpeed?: number;
}

export interface DetonateBehaviour extends BehaviourBase {
	type: "detonate";
	projectileId: string;
}

export interface RetractorBehaviour extends BehaviourBase {
	type: "retractor";
	heroId: string;
	spellId: string;
}

export interface RemovePassthroughBehaviour extends BehaviourBase {
	type: "removePassthrough";
	projectileId: string;
}

export interface UpdateCollideWithBehaviour extends BehaviourBase {
	type: "updateCollideWith";
	projectileId: string;
	collideWith: number;
	afterTick: number;
}

export interface LinkBehaviour extends BehaviourBase {
	type: "linkForce";
	heroId: string;
}

export interface GravityBehaviour extends BehaviourBase {
	type: "gravityForce";
	heroId: string;
}

export interface ReflectFollowBehaviour extends BehaviourBase {
	type: "reflectFollow";
	shieldId: string;
}

export interface ThrustBounceBehaviour extends BehaviourBase {
	type: "thrustBounce";
	heroId: string;
}

export interface ThrustDecayBehaviour extends BehaviourBase {
	type: "thrustDecay";
	heroId: string;
}

export interface SaberBehaviour extends BehaviourBase {
	type: "saberSwing";
	shieldId: string;
}

export interface ExpireBuffsBehaviour extends BehaviourBase {
	type: "expireBuffs";
	heroId: string;
}

export interface ExpireOnOwnerDeathBehaviour extends BehaviourBase {
	type: "expireOnOwnerDeath";
	projectileId: string;
}

export type WorldObject =
	Hero
	| Shield
	| Projectile
	| Obstacle;

export type WorldEvent =
	DetonateEvent
	| LifeStealEvent
	| TeleportEvent

export interface WorldEventBase {
	type: string;
}

export interface DetonateEvent extends WorldEventBase {
	type: "detonate";
	sourceId: string;
	sound?: string;
	pos: pl.Vec2;
	radius: number;
	explosionTicks: number;
}

export interface LifeStealEvent extends WorldEventBase {
	type: "lifeSteal";
	owner: string;
}

export interface TeleportEvent extends WorldEventBase {
	type: "teleport";
	fromPos: pl.Vec2;
	toPos: pl.Vec2;
	heroId: string;
	sound?: string;
}

export interface Action {
	type: string;
	target: pl.Vec2;
}

export type Trail = CircleTrail | LineTrail | RippleTrail | ArcTrail;

export interface TrailBase {
	initialTick: number;
	max: number;
	glow?: boolean;
}

export interface CircleTrail extends TrailBase {
	type: "circle";
	pos: pl.Vec2;
	radius: number;
	fillStyle: string;
}

export interface LineTrail extends TrailBase {
	type: "line";
	from: pl.Vec2;
	to: pl.Vec2;
	width: number;
	fillStyle: string;
}

export interface RippleTrail extends TrailBase {
	type: "ripple";
	pos: pl.Vec2;
	initialRadius: number;
	finalRadius: number;
	fillStyle: string;
}

export interface ArcTrail extends TrailBase {
	type: "arc";
	pos: pl.Vec2;
	minRadius: number;
	maxRadius: number;
	fromAngle: number;
	toAngle: number;
	antiClockwise: boolean;
	fillStyle: string;
}

export interface AudioElement {
    id: string;
    sound: string;
	pos: pl.Vec2;
	intensity?: number;
}