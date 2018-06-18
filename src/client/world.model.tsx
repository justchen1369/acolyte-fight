import pl from 'planck-js';

export interface World {
	tick: number;

	activePlayers: Set<string>;
	players: Map<string, Player>;

	objects: Map<string, WorldObject>,
	destroyed: WorldObject[];

	physics: pl.World;
	collisions: Collision[];

	radius: number;

	joinLeaveEvents: JoinOrLeaveEvent[];
	actions: Map<string, Action>,

	nextPositionId: number;
	nextBulletId: number;
	nextColorId: number;
	
	ui: UIState; // Temporary data which is visual-only and does not need to sync
};

export interface UIState {
	myGameId: string;
	myHeroId: string;

	previousObjectPositions: Map<string, pl.Vec2>;
	trails: Trail[];

	notifications: Notification[];
}

export interface Player {
	heroId: string;
	name: string;
	color: string;
}

export type Notification = JoinNotification | LeaveNotification | KillNotification;

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
	killer: Player;
	killed: Player;
	assist: Player;
}

export type JoinOrLeaveEvent = JoinEvent | LeaveEvent;

export interface JoinEvent {
	type: "join";
	heroId: string;
	playerName: string;
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
	charging: Charging;
	cooldowns: Cooldowns;
	shieldTicks: number;
}

export interface Charging {
	action?: Action;
	proportion?: number;
	spell?: string;
}

export interface Cooldowns {
	[spellId: string]: number;
}

export interface Projectile extends WorldObjectBase {
	category: "projectile";
	bullet: true;

	owner: string;
	body: pl.Body;

	targetId: string | null;
	damageMultiplier: number;
	expireTick: number;

	uiPreviousPos: pl.Vec2; // is only used for the UI and not guaranteed to be sync'd across clients!
}

export type WorldObject = Hero | Projectile;

export interface Action {
	type: string;
	target?: pl.Vec2;
}

export type Trail = CircleTrail | LineTrail;

export interface TrailBase {
	remaining: number;
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

export interface Collision {
	hero?: Hero;
	projectile?: Projectile;
	other?: WorldObject;
}