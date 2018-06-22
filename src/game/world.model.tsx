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

    homing?: HomingParametersTemplate;
    link?: LinkParametersTemplate;

    maxTicks: number;
    collideWith?: number;
	explodeOn: number;
	shieldTakesOwnership: boolean;

    trailTicks: number;

    color: string;
    selfColor?: boolean;
    glowPixels?: number;
    render: string;
}

export interface BounceParameters {
    damageFactor: number;
}

export interface HomingParametersTemplate {
    minDistanceToTarget?: number;
	turnRate: number;
	maxTurnProportion?: number;
    targetType?: string;
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
	tick: number;

	activePlayers: Set<string>;
	players: Map<string, Player>;

	objects: Map<string, WorldObject>,
	destroyed: WorldObject[];
	explosions: Explosion[];

	physics: pl.World;

	radius: number;

	joinLeaveEvents: JoinOrLeaveEvent[];
	actions: Map<string, Action>,

	nextPositionId: number;
	nextBulletId: number;
	nextColorId: number;
	
	ui: UIState; // Temporary data which is visual-only and does not need to sync
};

export interface UIState {
	myGameId: string | null;
	myHeroId: string | null;

	trails: Trail[];

	notifications: Notification[];
}

export interface Player {
	heroId: string;
	name: string;
	color: string;
}

export type Notification = HelpNotification | JoinNotification | LeaveNotification | KillNotification | MyHeroNotification;

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

export interface MyHeroNotification {
	type: "myHero";
	gameId: string;
	heroId: string;
}

export type JoinOrLeaveEvent = JoinEvent | LeaveEvent;

export interface JoinEvent {
	type: "join";
	heroId: string;
	playerName: string;
	keyBindings: KeyBindings;
}

export interface LeaveEvent {
	type: "leave";
	heroId: string;
}

export interface WorldObjectBase {
	id: string;
	category: string;
	type: string;
	bullet?: boolean;
	body: pl.Body;
	destroyed?: boolean;
	step?: pl.Vec2;
}

export interface Hero extends WorldObjectBase {
	category: "hero";
	type: "hero";

	health: number;
	body: pl.Body;
	casting: CastState | null;
	cooldowns: Cooldowns;
	shieldTicks?: number;
	thrustTicks?: number;

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

export interface Cooldowns {
	[spellId: string]: number;
}

export interface Projectile extends WorldObjectBase {
	category: "projectile";

	owner: string;
	body: pl.Body;

	targetId: string | null;
	damage: number;
	bounce?: BounceParameters;
	homing?: HomingParameters;
	link?: LinkParameters;
	shieldTakesOwnership: boolean;

	expireTick: number;
	maxTicks: number;
	explodeOn: number;

	render: string;
    radius: number;
	color: string;
	selfColor: boolean;
	glowPixels?: number;
    trailTicks: number;

	uiPreviousPos: pl.Vec2; // is only used for the UI and not guaranteed to be sync'd across clients!
}

export namespace HomingTargets {
	export const enemy = "enemy";
	export const self = "self";
	export const turn = "turn";
}

export interface HomingParameters {
	turnRate: number;
	maxTurnProportion: number;
	minDistanceToTarget: number;
	targetType: string;
}

export interface LinkParameters {
	heroId: string | null;
	strength: number;
	linkTicks: number;
}

export type WorldObject = Hero | Projectile;

export interface Explosion {
	pos: pl.Vec2;
	type: string;
}

export namespace ExplosionType {
	export const HeroDeath = "heroDeath";
	export const Scourge = "scourge";
} 

export interface Action {
	type: string;
	target?: pl.Vec2;
}

export type Trail = CircleTrail | LineTrail;

export interface TrailBase {
	remaining: number;
	max: number;
	fillStyle: string;
	glowPixels?: number;
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