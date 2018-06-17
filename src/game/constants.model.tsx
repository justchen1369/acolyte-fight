export interface Spells {
    [key: string]: Spell;
}

export type Spell = MoveSpell | ProjectileSpell | ScourgeSpell | ShieldSpell | TeleportSpell;

export interface SpellBase {
    id: string;
    action: string;

    damage?: number;

    chargeTicks?: number;
    cooldown: number;

    key?: string;
    icon?: string;

    color?: string;
}

export interface MoveSpell extends SpellBase {
    action: "move";
}

export interface ProjectileSpell extends SpellBase {
    action: "projectile";

    damage: number;
    bounceDamage?: number;

    density?: number;
    radius?: number;
    speed?: number;
    turnRate?: number;

    maxTicks: number;
    explodesOnImpact?: boolean;
    passthrough?: boolean;

    trailTicks?: number;

    render?: string;
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