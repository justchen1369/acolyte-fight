import pl from 'planck-js';

export interface World {
	tick: number;

	numPlayers: number;
	joining: string[];
	leaving: string[];
	activePlayers: Set<string>;

	objects: Map<string, WorldObject>,
	physics: pl.World;
	actions: Map<string, WorldAction>,
	radius: number;

	collisions: Collision[];
	destroyed: WorldObject[];

	nextHeroId: number,
	nextBulletId: number,

	trails: Trail[];
	ui: {
		myGameId: string | null,
		myHeroId: string | null,
	}
};

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
	fillStyle: string;
}

export interface Charging {
	action?: WorldAction;
	proportion?: number;
	spell?: string;
}

export interface Cooldowns {
}

export interface Projectile extends WorldObjectBase {
	category: "projectile";
	bullet: true;

	owner: string;
	body: pl.Body;

	targetId: string | null;
	damageMultiplier: number;
	expireTick: number;

	uiPreviousPos: pl.Vec2;
}

export type WorldObject = Hero | Projectile;

export interface WorldAction {
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