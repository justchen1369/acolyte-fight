import moment from 'moment';
import pl from 'planck-js';
import * as Immutable from 'immutable';
import * as n from './networking.model';
import * as shapes from './shapes';

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
	color: string;
	tick: number;
	startTick: number;

	activePlayers: Immutable.Set<string>; // Set<heroId: string>
	players: Immutable.Map<string, Player>; // heroId -> Player
	scores: Immutable.Map<string, HeroScore>; // heroId -> HeroScore
	teamAssignments: Immutable.Map<string, string>; // heroId -> teamId
	teams: Immutable.Map<string, Team>; // teamId -> Team
	winner: string | null; // heroId
	winners: string[] | null;
	winTick?: number;
	finished?: boolean;

	objects: Map<string, WorldObject>,
	behaviours: Behaviour[],

	physics: pl.World;
	collisions: Map<pl.Contact, Collision>;

	mapPoints?: pl.Vec2[];
	mapRadiusMultiplier: number;
	shrink: number;
	radius: number;

	controlMessages: n.ControlMsg[];
	snapshots: Snapshot[];
	syncs: Snapshot[];
	actions: Map<string, Action>,
	spellChanges: n.SpellsMsg[];

	nextPositionId: number;
	nextObjectId: number;
	nextColorId: number;
	
	settings: AcolyteFightSettings;
	mod: Object;

	ui: UIState; // Temporary data which is visual-only and does not need to sync
};

export interface Collision {
	a: WorldObject;
	b: WorldObject;
	point?: pl.Vec2;
}

export interface Team {
	teamId: string;
	color: string;
	heroIds: string[];
}

export interface HeroScore {
	heroId: string;
	kills: number;
	outlasts: number;
	damage: number;

	deathTick: number | null;
	rank: number | null;
}

export interface UIState {
	createTime: moment.Moment;

	myGameId: string | null;
	myHeroId: string | null;
	myPartyId: string | null;
	myUserHash: string | null;
	reconnectKey: string | null;
	live: boolean;
	locked?: string;

	nextTarget?: pl.Vec2;
	nextSpellId?: string;
	toolbar: ToolbarState;

	initialRenderTick?: number;
	renderedTick: number | null;
	playedTick: number;
	sentSnapshotTick: number;

	destroyed: WorldObject[];
	events: WorldEvent[];
	shakes: Shake[];
	highlights: MapHighlight[];

	underlays: Trail[];
	trails: Trail[];
	changedTrailHighlights: Map<string, TrailHighlight>;
	notifications: Notification[];

	buttonBar?: ButtonConfig;
	camera: Camera;
	renderDimensions?: RenderDimensions;

	saved?: boolean;
}

export interface ToolbarState {
	hoverSpellId?: string;
	hoverBtn?: string;
	hoverControl?: string;
	customizingBtn?: string;
}

export interface Camera {
	zoom: number;
	center: pl.Vec2;
}

export interface RenderDimensions {
	rect: ClientRect;
	viewRect: ClientRect;
	worldRect: ClientRect;
}

export type ButtonConfig = ButtonBarConfig | ButtonWheelConfig;

export interface ButtonConfigBase {
	screenWidth: number;
	screenHeight: number;
}

export interface ButtonBarConfig extends ButtonConfigBase {
	view: "bar";

	region: ClientRect;
	scaleFactor: number;

	keys: KeyConfig[];
	hitBoxes: Map<string, ClientRect>;

	buttons: Map<string, ButtonRenderState>;
}

export interface ButtonWheelConfig extends ButtonConfigBase {
	view: "wheel";
	region: ClientRect;
	wheelOnRight: boolean;

	center: pl.Vec2;
	hitSectors: Map<string, HitSector>;
	innerRadius: number;
	outerRadius: number;

	targetSurfaceCenter: pl.Vec2;
	targetSurfaceDrawn?: boolean;

	buttons: Map<string, ButtonRenderState>;
}

export interface HitSector {
	startAngle: number;
	endAngle: number;
	weight: number;
}

export interface Player {
	heroId: string;
	controlKey: number;
	userId?: string;
	userHash: string | null;
	partyHash?: string;
	name: string;
	isSharedBot: boolean;
	isBot: boolean;
	isMobile: boolean;
	dead?: boolean;

	// Not synced across clients
	uiBaseColor: string;
	uiColor: string;
}

export interface ButtonRenderState {
	key: string;
	color: string;
	icon: string;
	cooldownText: string;
	emphasis: number;
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
	| TeamsNotification
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
	userHash: string;
	name: string;
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
}

export interface NewGameNotification {
	type: "new";
	gameId: string;
	heroId: string;
	room: string | null;
	isPrivate: boolean;
}

export interface CloseGameNotification {
	type: "closing";
	ticksUntilClose: number;
	teamSizes?: number[];
}

export interface TeamsNotification {
	type: "teams";
	teamSizes?: number[];
}

export interface WinNotification {
	type: "win";
	myHeroId: string;
	winners: Player[];

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
	initialNumGames: number;
	initialAco: number;
	initialAcoExposure: number;
	acoDelta: number;
	category: string;
}

export interface Snapshot {
	tick: number;
	objectLookup: Map<string, ObjectSnapshot>;
}

export interface ObjectSnapshot {
	pos: pl.Vec2;
	angle?: number;
	health?: number;
}

export interface WorldObjectBase {
	id: string;
	category: string;
	categories: number;
	body: pl.Body;
	destroyedTick?: number;
	blocksTeleporters?: boolean;

	posDelta?: pl.Vec2;
	velocityDelta?: pl.Vec2;
	impulseDelta?: pl.Vec2;

	uiEase?: pl.Vec2;
}

export interface HighlightSource {
	id: string;
	uiHighlight?: TrailHighlight;
}

export interface Obstacle extends WorldObjectBase, HitSource, HighlightSource {
	category: "obstacle";
	type: string;

	static?: boolean;
	sensor: boolean;
	collideWith: number;
	expireOn: number;
	undamageable?: boolean;

	maxHealth: number;
	health: number;

	createTick: number;
	destroyedTick?: number;

	shape: shapes.Shape;

	damage: number;
	buffs: BuffTemplate[];
	detonate?: DetonateParametersTemplate;
	mirror?: boolean;
	conveyor?: ConveyorParameters;
	impulse: number;

	hitTick?: number;
	lavaTick?: number;
	activeTick?: number;
	touchTick?: number;

	render: SwatchRender[];
	strike?: RenderStrikeParams;
	sound?: string;

	uiEase?: pl.Vec2;
}

export interface CircleShape {
	radius: number;
}

export interface Hero extends WorldObjectBase, HighlightSource {
	category: "hero";
	filterGroupIndex: number;

	health: number;
	maxHealth: number;
	body: pl.Body;
	radius: number;
	moveSpeedPerSecond: number;
	maxSpeed: number;
	revolutionsPerTick: number;
	linearDamping: number;

	createTick: number;
	hitTick?: number; // hit by anything (lava or non-lava)
	strikeTick?: number; // hit by something (not lava)
	cleanseTick?: number;
	exitTick?: number;

	damageSources: Map<string, number>;
	damageSourceHistory: DamageSourceHistoryItem[];

	moveTo?: pl.Vec2;
	target?: pl.Vec2;
	casting: CastState | null;
	cooldowns: Cooldowns;
	throttleUntilTick: number;
	uiCastTrail?: CastHistoryItem;

	shieldIds: Set<string>; // Will keep pointing at shield after it is gone
	horcruxIds: Set<string>; // Will keep pointing at projectiles after they are gone
	focusIds: Map<string, string>; // spellId -> projectile id. Will keep pointing at projectiles after they are gone

	link?: LinkState;
	thrust?: ThrustState;
	gravity?: GravityState;
	invisible?: VanishBuff;
	buffs: Map<string, Buff>;

	killerHeroId?: string;
	knockbackHeroId?: string;

	keysToSpells: Map<string, string>;
	spellsToKeys: Map<string, string>;
	spellChangedTick: Map<string, number>;

	// These fields are not synced
	uiHealth: number;
	uiDestroyedBuffs: Buff[];
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

	damageMultiplier: number;
	takesOwnership: boolean;
	destroying?: boolean;
	owner: string;

	color: string;
	selfColor?: boolean;
	hitTick?: number;
	glow?: number;
	bloom?: number;
	shine?: number;
	strike?: RenderStrikeParams;
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

export interface Saber extends ShieldBase, HighlightSource, HitSource {
	type: "saber";

	spellId: string;
	channelling: boolean;

	angleOffset: number;
	length: number;
	width: number;

	points: pl.Vec2[];

	shiftMultiplier: number;
	speedMultiplier: number;
	maxSpeed: number;

	turnRate: number;

	damageTemplate?: DamagePacketTemplate;
	hitBuffs?: BuffTemplate[];

	strike?: RenderStrikeParams;
	trailTicks: number;
	uiPreviousAngle: number;
}


export type Shield = Reflect | Wall | Saber;

export interface CastState {
	action: Action;

	initialAngle: number;

	stage: number;
	uninterruptible?: boolean;
	movementProportion?: number;

	chargeStartTick?: number;
	channellingStartTick?: number;
	releaseTick?: number;

	proportion?: number;
	color?: string;

	uiScale?: number;
}

export interface CastHistoryItem {
	spellId: string;
	color: string;
	glow?: number;
	castTick: number;
}

export interface LinkState extends HighlightSource {
	spellId: string;
	targetId: string;

	selfFactor: number;
	targetFactor: number;

	impulsePerTick: number;
	sidewaysImpulsePerTick: number;
	minDistance: number;
	maxDistance: number;
	massInvariant?: boolean;

	redirectDamage?: RedirectDamageParameters;
	channelling?: boolean;

	initialTick: number;
	expireTick: number;
	redirectDamageTick?: number;

	render: RenderLink;
}

export interface ThrustState {
	damageTemplate: DamagePacketTemplate;
	velocity: pl.Vec2;
	ticks: number;
	nullified: boolean;
	alreadyHit: Set<string>;

	initialRadius: number;
	fixture: pl.Fixture;
}

export interface GravityState {
	spellId: string;
	initialTick: number;
	expireTick: number;
	location: pl.Vec2;
	strength: number;
	radius: number;
	power: number;
	render?: RenderSwirl;
}

export type Buff =
	MovementBuff
	| GlideBuff
	| LavaImmunityBuff
	| VanishBuff
	| LifeStealBuff
	| BurnBuff
	| ArmorBuff

export interface BuffValues {
	destroyedTick?: number;
	maxTicks: number;
	initialTick: number;
	expireTick: number;
	channellingSpellId?: string; // If the hero stops casting this spell, remove the buff
	link?: LinkChannellingBuffParams;
	hitTick?: number; // If the hero gets hit, remove the buff
	numStacks: number;

	render?: RenderBuff;
	sound?: string;
}

export interface LinkChannellingBuffParams {
	owner: string; // heroId
	spellId: string; // The owner must be casting this link spell
}

export interface BuffBase extends BuffValues {
	id: string;
	type: string;
}

export interface MovementBuff extends BuffBase {
	type: "movement";
	movementProportion: number;
}

export interface GlideBuff extends BuffBase {
	type: "glide";
	linearDampingMultiplier: number;
}

export interface LavaImmunityBuff extends BuffBase {
	type: "lavaImmunity";
	damageProportion: number;
}

export interface VanishBuff extends BuffBase {
	type: "vanish";
	initialPos: pl.Vec2;
}

export interface LifeStealBuff extends BuffBase {
	type: "lifeSteal";
	lifeSteal?: number;
	damageMultiplier?: number;
	minHealth?: number;
	decay?: boolean;
}

export interface BurnBuff extends BuffBase {
	type: "burn";
	hitInterval: number;
	packet: DamagePacketTemplate;
	fromHeroId: string;
	stack?: string;
}

export interface ArmorBuff extends BuffBase {
	type: "armor";
	fromHeroId?: string;
	proportion: number;
}

export interface Cooldowns {
	[spellId: string]: number;
}

export interface HitSource {
	hitInterval?: number;
	hitTick?: number;
	hitTickLookup: Map<string, number>; // object id -> tick
}

export interface Projectile extends WorldObjectBase, HitSource, HighlightSource {
	category: "projectile";
	type: string;

	owner: string;
	body: pl.Body;
	collideWith: number;
	sensor?: boolean;

	collidedTick?: number;
	hit?: number;

	speed: number;
	fixedSpeed: boolean;
	attractable?: boolean;
	linkable?: boolean;

	target: pl.Vec2;
	targetId: string | null;

	damageTemplate: DamagePacketTemplate;
	partialDamage?: PartialDamageParameters;
	partialDetonateRadius?: PartialDamageParameters;
	partialDetonateImpulse?: PartialDamageParameters;
	partialBuffDuration?: PartialDamageParameters;
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
	expireOnMirror?: boolean;
	destructible?: DestructibleParameters;

	color: string;
	renderers: RenderParams[];
	sound?: string;
	soundHit?: string;
    radius: number;

	uiPath: pl.Vec2[]; // is only used for the UI and not guaranteed to be sync'd across clients!
	uiShake?: Shake;
}

export interface DamagePacket {
	fromHeroId: string;
	damage: number;
	lifeSteal: number;
	isLava?: boolean;
	noHit?: boolean;
	minHealth?: number;
	noMitigate?: boolean;
	noRedirect?: boolean;
	noKnockback?: boolean;
}

export interface DetonateParameters extends DamagePacket {
	against?: number;

	radius: number; // The radius of the explosion
	
	minImpulse: number;
	maxImpulse: number;

	renderTicks: number; // Length of explosion
	sound?: string;

	buffs?: BuffTemplate[];

	partialRadius?: PartialDamageParameters; // Scale the radius over time
	partialImpulse?: PartialDamageParameters; // Scale the impulse over time
}


export namespace HomingTargets {
	export const enemy = "enemy";
	export const self = "self";
	export const cursor = "cursor";
	export const follow = "follow";
}

export type Behaviour =
	DelayBehaviour
	| ResetMassBehaviour
	| FixateBehaviour
	| HomingBehaviour
	| AccelerateBehaviour
	| DetonateBehaviour
	| RetractorBehaviour
	| RemovePassthroughBehaviour
	| UpdateCollideWithBehaviour
	| ClearHitsBehaviour
	| LinkBehaviour
	| GravityBehaviour
	| GlideBehaviour
	| StrafeBehaviour
	| ReflectFollowBehaviour
	| ThrustBounceBehaviour
	| ThrustDecayBehaviour
	| SaberBehaviour
	| BurnBehaviour
	| AttractBehaviour
	| AuraBehaviour
	| ExpireBuffsBehaviour
	| ExpireOnOwnerDeathBehaviour
	| ExpireOnOwnerRetreatBehaviour
	| ExpireOnChannellingEndBehaviour

export interface BehaviourBase {
	type: string;
}

export interface DelayBehaviour extends BehaviourBase {
	type: "delayBehaviour";
	afterTick: number;
	delayed: Behaviour;
}

export interface ResetMassBehaviour extends BehaviourBase {
	type: "resetMass";
	tick: number;
	objId: string;
}

export interface FixateBehaviour extends BehaviourBase {
	type: "fixate";
	untilGameStarted?: boolean;

	objId: string;
	pos: pl.Vec2;
	angle: number;
	proportion: number;
	speed: number;
	turnRate: number;
}

export interface HomingBehaviour extends BehaviourBase {
	type: "homing";
	targetType: HomingType;

	projectileId: string;

	turnRate: number;
	maxTurnProportion: number;
	minDistanceToTarget: number;

	expireWithinAngle: number;
	expireTick: number;

	newSpeed?: number;
}

export interface AccelerateBehaviour extends BehaviourBase {
	type: "accelerate";

	projectileId: string;

	maxSpeed: number;
	accelerationPerTick: number;
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
}

export interface ClearHitsBehaviour extends BehaviourBase {
	type: "clearHits";
	projectileId: string;
}

export interface LinkBehaviour extends BehaviourBase {
	type: "linkForce";
	heroId: string;
}

export interface GravityBehaviour extends BehaviourBase {
	type: "gravityForce";
	heroId: string;
}

export interface GlideBehaviour extends BehaviourBase {
	type: "glide";
	heroId: string;
}

export interface StrafeBehaviour extends BehaviourBase {
	type: "strafe";
	projectileId: string;
	previousOwner: string;
	previousPos: pl.Vec2;
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

export interface BurnBehaviour extends BehaviourBase {
	type: "burn";
	heroId: string;
}

export interface AttractBehaviour extends BehaviourBase {
	type: "attract";
	objectId: string;
	owner: string;

	against: number;
	collideLike: number;
	categories: number;
	notCategories: number;
	radius: number;
	accelerationPerTick: number;
	maxSpeed?: number;
}

export interface AuraBehaviour extends BehaviourBase {
	type: "aura";
	objectId: string;
	owner: string;
	against: number;

	radius: number;
	tickInterval: number;
	remainingHits: number;
	packet?: DamagePacketTemplate;
	buffs: BuffTemplate[];
}

export interface ExpireBuffsBehaviour extends BehaviourBase {
	type: "expireBuffs";
	heroId: string;
}

export interface ExpireOnOwnerDeathBehaviour extends BehaviourBase {
	type: "expireOnOwnerDeath";
	projectileId: string;
}

export interface ExpireOnOwnerRetreatBehaviour extends BehaviourBase {
	type: "expireOnOwnerRetreat";
	projectileId: string;
	anchorPoint: pl.Vec2;
	maxDistance: number;
}

export interface ExpireOnChannellingEndBehaviour extends BehaviourBase {
	type: "expireOnChannellingEnd";
	projectileId: string;
}

export type WorldObject =
	Hero
	| Shield
	| Projectile
	| Obstacle

export type WorldEvent =
	DetonateEvent
	| LifeStealEvent
	| TeleportEvent
	| PushEvent
	| VanishEvent
	| SetCooldownEvent

export interface WorldEventBase {
	type: string;
	tick: number;
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

export interface VanishEvent extends WorldEventBase {
	type: "vanish";
	heroId: string;
	pos: pl.Vec2;
	appear: boolean;
}

export interface SetCooldownEvent extends WorldEventBase {
	type: "cooldown";
	heroId: string;
	color?: string;
	sound?: string;
}

export interface PushEvent extends WorldEventBase {
	type: "push";
	owner: string;
	objectId: string;
	direction: pl.Vec2;
	color?: string;
}

export interface Action {
	type: string;
	target: pl.Vec2;
	release?: boolean;
}

export interface MapHighlight {
	color: string;
	fromTick: number;
	maxTicks: number;
}

export interface Shake {
	direction: pl.Vec2;
	fromTick: number;
	maxTicks: number;
}

export type Trail = CircleTrail | LineTrail | RippleTrail | ArcTrail | PolygonTrail;

export interface TrailBase {
	initialTick: number;
	max: number;

	fillStyle: string;
	shine?: number; // Lighten to start with
	fade?: string; // Fade away into this color
	vanish?: number; // Fade away into transparent

	bloom?: number; // Bloom radius
	glow?: number; // Bloom alpha

	highlight?: TrailHighlight;
	tag?: string; // Normally based on the projectile id or hero id - used to make the projectile glow on hit
}

export interface TrailHighlight {
	tag: string;
	fromTick: number;
	maxTicks: number;
	flash?: boolean;
	growth?: number;
	bloom?: number;
}

export interface CircleTrail extends TrailBase {
	type: "circle";
	pos: pl.Vec2;
	velocity?: pl.Vec2;
	radius: number;
}

export interface PolygonTrail extends TrailBase {
	type: "polygon";
	pos: pl.Vec2;
	points: pl.Vec2[];
	angle: number;
	velocity?: pl.Vec2;
	extent: number;
}

export interface LineTrail extends TrailBase {
	type: "line";
	from: pl.Vec2;
	to: pl.Vec2;
	width: number;
}

export interface RippleTrail extends TrailBase {
	type: "ripple";
	pos: pl.Vec2;
	initialRadius: number;
	finalRadius: number;
}

export interface ArcTrail extends TrailBase {
	type: "arc";
	pos: pl.Vec2;
	minRadius: number;
	maxRadius: number;
	fromAngle: number;
	toAngle: number;
	antiClockwise: boolean;
}