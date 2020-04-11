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

	export const NonGameStarters = [Move, MoveAndCancel, Retarget, Stop];
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
	background: string;
	startMessage: string;

	tick: number;
	startTick: number;

	activePlayers: Immutable.Set<number>; // Set<heroId: number>
	players: Immutable.Map<number, Player>; // heroId -> Player
	controlKeysXX: Map<number, number>; // controlKey -> heroId
	scores: Immutable.Map<number, HeroScore>; // heroId -> HeroScore
	spellRecords: Map<number, string[]>; // heroId -> spellId[]
	teamAssignments: Immutable.Map<number, string>; // heroId -> teamId
	teams: Immutable.Map<string, Team>; // teamId -> Team
	winner: number | null; // heroId
	winners: number[] | null;
	winTick?: number;
	finished?: boolean;

	objects: Map<number, WorldObject>,
	behaviours: Behaviour[],
	colliders: Collider[],

	physics: pl.World;
	collisions: Map<pl.Contact, Collision>;

	shape: shapes.Shape;
	shrink: number;
	initialRadius: number;
	angle: number;

	actionMessages: n.ActionMsg[];
	controlMessages: n.ControlMsg[];
	snapshots: Snapshot[];
	syncs: Snapshot[];
	actions: Map<number, Action[]>,

	nextPositionId: number;
	nextObjectId: number;
	nextBuffId: number;
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
	heroIds: number[];
}

export interface HeroScore {
	heroId: number;
	kills: number;
	outlasts: number;
	damage: number;

	deathTick: number | null;
	rank: number | null;
}

export interface UIState {
	createTime: moment.Moment;

	myRoomId: string | null;
	myGameId: string | null;
	myHeroId: number | null;
	myPartyId: string | null;
	myUserHash: string | null;
	controlKeyXX: number | null;
	reconnectKey: string | null;
	universeId: number;
	live: boolean;
	locked?: string;
	autoJoin?: boolean;

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
	changedTrailHighlights: Map<number, TrailHighlight>;
	notifications: Notification[];

	buttonBar?: ButtonConfig;
	camera: Camera;
	renderDimensions?: RenderDimensions;

	saved?: boolean;
}

export interface ToolbarState {
	alternativeSpellId?: string;
	hoverSpellId?: string;
	hoverBtn?: string;
	hoverControl?: string;
	hoverButtonPanel?: string;
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
	retinaMultiplier: number;
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
	heroId: number;
	controlKey: number;
	userId?: string;
	userHash: string | null;
	name: string;
	isSharedBot: boolean;
	isBot: boolean;
	isMobile: boolean;
	difficulty: number;
	nonIdle?: boolean;
	dead?: boolean;
	left?: boolean; // This was a human player who left

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
	JoinNotification 
	| BotNotification 
	| LeaveNotification 
	| KillNotification 
	| TeamsNotification
	| CloseGameNotification
	| WinNotification

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
	split?: boolean;
}

export interface KillNotification {
	type: "kill";
	myHeroId: number;
	killed: Player;
	killer: Player | null;
}

export interface CloseGameNotification {
	type: "closing";
	ticksUntilClose: number;
	message: string;
}

export interface TeamsNotification {
	type: "teams";
	teamSizes?: number[];
}

export interface WinNotification {
	type: "win";
	myHeroId: number;
	winners: Player[];

	mostDamage: Player;
	mostDamageAmount: number;

	mostKills: Player;
	mostKillsCount: number;
}

export interface Snapshot {
	tick: number;
	objectLookup: Map<number, ObjectSnapshot>;
}

export interface ObjectSnapshot {
	pos: pl.Vec2;
	angle?: number;
	health?: number;
}

export interface WorldObjectBase {
	id: number;
	owner: number;
	category: string;
	categories: number;
	body: pl.Body;

	createTick: number;
	destroyedTick?: number;

	blocksTeleporters?: boolean;
	swappable?: boolean;

	posDelta?: pl.Vec2;
	velocityDelta?: pl.Vec2;
	impulseDelta?: pl.Vec2;

	uiEase?: pl.Vec2;

	colliders?: Set<Collider>;
}

export interface HighlightSource {
	id: number;
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
	expireTick?: number;
	destroyedTick?: number;

	shape: shapes.Shape;

	damage: number;
	selfDamage: number;
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
	heroIndex: number;
	filterGroupIndex: number;
	initialCollideWith: number;
	collideWith: number;

	health: number;
	maxHealth: number;
	body: pl.Body;
	initialRadius: number;
	radius: number;
	moveSpeedPerSecond: number;
	maxSpeed: number;
	revolutionsPerTick: number;
	linearDamping: number;

	createTick: number;
	hitTick?: number; // hit by anything (lava or non-lava)
	strikeTick?: number; // hit by something (not lava)
	bumpTick?: number; // bumped another hero
	cleanseTick?: number;
	exitTick?: number;

	armorProportion: number;
	armorModifiers: Map<string, number>; // source -> modifier
	damageSources: Map<number, number>; // heroId -> damage
	damageSourceHistory: DamageSourceHistoryItem[];

	moveTo?: pl.Vec2;
	target?: pl.Vec2;
	casting: CastState | null;
	cooldowns: Cooldowns;
	cooldownRates: Cooldowns;
	throttleUntilTick: number;
	uiCastTrail?: CastHistoryItem;

	shieldIds: Set<number>; // Will keep pointing at shield after it is gone
	horcruxIds: Set<number>; // Will keep pointing at projectiles after they are gone
	focusIds: Map<string, number>; // spellId -> projectile id. Will keep pointing at projectiles after they are gone

	link?: LinkState;
	thrust?: ThrustState;
	gravity?: GravityState;
	invisible?: VanishBuff;
	buffs: Map<string, Buff>; // buffId -> Buff

	killerHeroId?: number;
	knockbackHeroId?: number;

	keysToSpells: Map<string, string>;
	spellsToKeys: Map<string, string>;
	spellChangedTick: Map<string, number>;

	// These fields are not synced
	uiHealth: number;
	uiDestroyedBuffs: Buff[];
	uiPreviousAngle?: number;
	uiTurnHighlightTicks?: number;
}

export interface DamageSourceHistoryItem {
	heroId: number;
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
	conveyable?: boolean;
	bumpable?: boolean;
	destroying?: boolean;
	owner: number;

	color: string;
	selfColor?: boolean;
	hitTick?: number;

	light?: number;
	glow?: number;
	bloom?: number;
	shine?: number;
	shadow?: number;
	strike?: RenderStrikeParams;
}

export interface Reflect extends ShieldBase {
	type: "reflect";
	minRadius: number;
	strokeRadius: number;
	radius: number;
	angularWidth: number;
	points: pl.Vec2[];
	turnRate: number;
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
	id: number;
	action: Action;

	initialAngle: number;

	stage: number;
	uninterruptible?: boolean;
	movementProportion?: number;

	castStartTick?: number;
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
	targetId: number;

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
	ticks: number;

	nullified: boolean;
	alreadyHit: Set<number>;
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
	| CleanseBuff
	| CooldownBuff
	| GlideBuff
	| LavaImmunityBuff
	| VanishBuff
	| LifeStealBuff
	| BurnBuff
	| ArmorBuff
	| MassBuff
	| BumpBuff

export interface BuffValues {
	owner: number;
	cleansable?: boolean;
	destroyedTick?: number;
	maxTicks: number;
	initialTick: number;
	expireTick: number;
	channellingSpellId?: string; // If the hero stops casting this spell, remove the buff
	passiveSpellId?: string; // If the hero stops choosing this spell, remove the buff
	resetOnGameStart?: boolean;
	link?: LinkChannellingBuffParams;
	cancelOnBump?: boolean;
	hitTick?: number; // If the hero gets hit, remove the buff
	numStacks: number;

	renderStart?: RenderBuff;
	render?: RenderBuff;
	renderFinish?: RenderBuff;
	sound?: string;

	uiStartRendered?: boolean;
}

export interface LinkChannellingBuffParams {
	owner: number; // heroId
	spellId: string; // The owner must be casting this link spell
}

export interface BuffBase extends BuffValues {
	id: string;
	type: string;
}

export interface CleanseBuff extends BuffBase {
	type: "cleanse";
}

export interface MovementBuff extends BuffBase {
	type: "movement";
	movementProportion: number;
	decay?: boolean;
}

export interface CooldownBuff extends BuffBase {
	type: "cooldown";

	spellIds?: Set<string>;
	notSpellIds?: Set<string>;
	cooldownRateModifier: number;
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
	noTargetingIndicator?: boolean;
	noBuffs?: boolean; // Hide buff smoke
}

export interface LifeStealBuff extends BuffBase {
	type: "lifeSteal";
	lifeSteal?: number;
	damageMultiplier?: number;
	minHealth?: number;
	decay?: boolean;

	stack?: string;
	source?: string;
}

export interface BurnBuff extends BuffBase {
	type: "burn";
	hitInterval: number;
	packet: DamagePacketTemplate;
	fromHeroId: number;
	stack?: string;
}

export interface ArmorBuff extends BuffBase {
	type: "armor";
	proportion: number;

	stack?: string;
	source?: string;
}

export interface MassBuff extends BuffBase {
	type: "mass";
	restrictCollideWith: number;
	appendCollideWith: number;
	fixture: pl.Fixture;
	radius: number;
}

export interface BumpBuff extends BuffBase, HitSource {
	type: "bump";
	impulse: number;
}

export interface Cooldowns {
	[spellId: string]: number;
}

export interface HitSource {
	hitInterval?: number;
	hitTick?: number;
	hitTickLookup: Map<number, number>; // object id -> tick
}

export interface Projectile extends WorldObjectBase, HitSource, HighlightSource {
	category: "projectile";
	type: string;

	owner: number;
	body: pl.Body;
	collideWith: number;
	sense: number;
	filterGroupIndex: number;

	collidedTick?: number;
	hit?: number;

	speed: number;
	speedDecayPerTick: number;

	attractable?: AttractableParameters;
	linkable?: boolean;
	bumpable?: boolean;
	conveyable?: boolean;
	destroying?: boolean;

	target: ProjectileTargets;

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

export interface ProjectileTargets {
	pos: pl.Vec2; // Projectile target position
	heroId: number; // Which hero was closest when firing the projectile

	releasePos: pl.Vec2; // Cursor position when button released
}

export interface DamagePacket {
	fromHeroId: number;
	damage: number;
	lifeSteal: number;
	isLava?: boolean;
	noHit?: boolean;
	minHealth?: number;
	noMitigate?: boolean;
	noRedirect?: boolean;
	noKnockback?: boolean;
	source?: string;
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

	swapWith?: number;
}

export namespace HomingTargets {
	export const enemy = "enemy";
	export const self = "self";
	export const cursor = "cursor";
	export const release = "release";
	export const follow = "follow";
}

export interface Collider {
	delayed: Behaviour | Behaviour[];

	collideWith: number;
	against: number;

	afterTicks: number;
	collideTick?: number;

	done?: boolean;
}

export type Behaviour =
	DelayBehaviour
	| TriggerOnExpiryBehaviour
	| SpawnProjectileBehaviour
	| CooldownBehaviour
	| FixateBehaviour
	| AlignProjectileBehaviour
	| LimitSpeedBehaviour
	| DecayHealthBehaviour
	| DecayMitigationBehaviour
	| HomingBehaviour
	| AccelerateBehaviour
	| DetonateBehaviour
	| RetractorBehaviour
	| RemovePassthroughBehaviour
	| UpdatePartialBehaviour
	| UpdateCollideWithBehaviour
	| ClearHitsBehaviour
	| LinkBehaviour
	| GravityBehaviour
	| StrafeBehaviour
	| ReflectFollowBehaviour
	| ThrustVelocityBehaviour
	| ThrustFollowBehaviour
	| ThrustDecayBehaviour
	| SaberBehaviour
	| BurnBehaviour
	| AttractBehaviour
	| AuraBehaviour
	| ExpireBehaviour
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

export interface TriggerOnExpiryBehaviour extends BehaviourBase {
	type: "triggerOnExpiry";
	obj: WorldObject;
	delayed: Behaviour;
}

export interface CooldownBehaviour extends BehaviourBase {
	type: "cooldown";
	heroId: number;
}

export interface FixateBehaviour extends BehaviourBase {
	type: "fixate";
	untilGameStarted?: boolean;

	objId: number;
	pos: pl.Vec2;
	angle: number;
	proportion: number;
	speed: number;
	turnRate: number;
}

export interface SpawnProjectileBehaviour extends BehaviourBase {
	type: "subprojectile";
	parent: WorldObject;
	template: ProjectileTemplate;

	numProjectiles: number;
	spread: number; // in revs

	expire?: boolean;
}

export interface AlignProjectileBehaviour extends BehaviourBase {
	type: "alignProjectile";
	projectileId: number;
}

export interface DecayHealthBehaviour extends BehaviourBase {
	type: "decayHealth";
	objId: number;
	decayPerTick: number;
}

export interface LimitSpeedBehaviour extends BehaviourBase {
	type: "limitSpeed";
	objId: number;
	speedLimit: number;
}

export interface DecayMitigationBehaviour extends BehaviourBase {
	type: "decayMitigation";
	heroId: number;
}

export interface HomingBehaviour extends BehaviourBase {
	type: "homing";
	targetType: HomingType;

	projectileId: number;

	turnRate: number;
	maxTurnProportion: number;
	minDistanceToTarget: number;

	expireWithinAngle: number;
	expireTick: number;

	newSpeed?: number;
	newSpeedDecayPerTick?: number;
}

export interface AccelerateBehaviour extends BehaviourBase {
	type: "accelerate";

	projectileId: number;

	maxSpeed: number;
	accelerationPerTick: number;
}

export interface DetonateBehaviour extends BehaviourBase {
	type: "detonate";
	projectileId: number;
}

export interface RetractorBehaviour extends BehaviourBase {
	type: "retractor";
	heroId: number;
	spellId: string;
}

export interface RemovePassthroughBehaviour extends BehaviourBase {
	type: "removePassthrough";
	projectileId: number;
}

export interface UpdateCollideWithBehaviour extends BehaviourBase {
	type: "updateCollideWith";
	projectileId: number;
	collideWith: number;
}

export interface UpdatePartialBehaviour extends BehaviourBase {
	type: "updatePartial";
	projectileId: number;

	partialDamage?: PartialDamageParameters;
	partialDetonateRadius?: PartialDamageParameters;
	partialDetonateImpulse?: PartialDamageParameters;
	partialBuffDuration?: PartialDamageParameters;
}

export interface ClearHitsBehaviour extends BehaviourBase {
	type: "clearHits";
	projectileId: number;
}

export interface LinkBehaviour extends BehaviourBase {
	type: "linkForce";
	heroId: number;
}

export interface GravityBehaviour extends BehaviourBase {
	type: "gravityForce";
	heroId: number;
}

export interface StrafeBehaviour extends BehaviourBase {
	type: "strafe";
	projectileId: number;
	previousOwner: number;
	previousPos: pl.Vec2;
	maxSpeed?: number;
}

export interface ReflectFollowBehaviour extends BehaviourBase {
	type: "reflectFollow";
	shieldId: number;
}

export interface ThrustVelocityBehaviour extends BehaviourBase {
	type: "thrustVelocity";
	heroId: number;
	velocity: pl.Vec2;
}

export interface ThrustFollowBehaviour extends BehaviourBase {
	type: "thrustFollow";
	heroId: number;
	speed: number;
}

export interface ThrustDecayBehaviour extends BehaviourBase {
	type: "thrustDecay";
	heroId: number;
}

export interface SaberBehaviour extends BehaviourBase, HitSource {
	type: "saberSwing";
	shieldId: number;
}

export interface BurnBehaviour extends BehaviourBase {
	type: "burn";
	heroId: number;
}

export interface AttractBehaviour extends BehaviourBase, HitSource {
	type: "attract";
	objectId: number;
	owner: number;

	against: number;
	collideLike: number;
	categories: number;
	notCategories: number;
	radius: number;
	accelerationPerTick: number;
	maxSpeed?: number;
	clampSpeed?: number;
}

export interface AuraBehaviour extends BehaviourBase, HitSource {
	type: "aura";
	objectId: number;
	owner: number;
	against: number;

	radius: number;
	remainingHits: number;
	packet?: DamagePacketTemplate;
	buffs: BuffTemplate[];
}

export interface ExpireBehaviour extends BehaviourBase {
	type: "expire";
	objId: number;
}

export interface ExpireBuffsBehaviour extends BehaviourBase {
	type: "expireBuffs";
	heroId: number;
}

export interface ExpireOnOwnerDeathBehaviour extends BehaviourBase {
	type: "expireOnOwnerDeath";
	projectileId: number;
}

export interface ExpireOnOwnerRetreatBehaviour extends BehaviourBase {
	type: "expireOnOwnerRetreat";
	projectileId: number;
	anchorPoint: pl.Vec2;
	maxDistance: number;
}

export interface ExpireOnChannellingEndBehaviour extends BehaviourBase {
	type: "expireOnChannellingEnd";
	projectileId: number;
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
	| SetCooldownEvent
	| CastEvent

export interface WorldEventBase {
	type: string;
	tick: number;
}

export interface DetonateEvent extends WorldEventBase {
	type: "detonate";
	sourceId: number;
	sound?: string;
	pos: pl.Vec2;
	radius: number;
	explosionTicks: number;
}

export interface LifeStealEvent extends WorldEventBase {
	type: "lifeSteal";
	owner: number;
}

export interface TeleportEvent extends WorldEventBase {
	type: "teleport";
	fromPos: pl.Vec2;
	toPos: pl.Vec2;
	heroId: number;
	sound?: string;
}

export interface SetCooldownEvent extends WorldEventBase {
	type: "cooldown";
	heroId: number;
	color?: string;
	sound?: string;
}

export interface CastEvent extends WorldEventBase {
	type: "cast";
	heroId: number;
	target: pl.Vec2;
	spellId: string;
	success: boolean;
}

export interface PushEvent extends WorldEventBase {
	type: "push";
	owner: number;
	objectId: number;
	direction: pl.Vec2;
	color?: string;
}

export interface LeaveEvent extends WorldEventBase {
	type: "leave";
	heroId: number;
	pos: pl.Vec2;
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
	light?: number; // Render additively
	shadow?: number; // Also render a shadow below this trail

	bloom?: number; // Bloom radius
	glow?: number; // Bloom alpha

	highlight?: TrailHighlight;
	tag?: number; // Normally based on the projectile id or hero id - used to make the projectile glow on hit
}

export interface TrailHighlight {
	tag: number;
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