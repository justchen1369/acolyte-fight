export const MaxPlayerNameLength = 30;

export function sanitizeName(input: string) {
    let name = input || "";
    name = name.replace(/\W/g, '');
    if (name.length > MaxPlayerNameLength) {
        name = name.substring(0, MaxPlayerNameLength);
    }
    return name;
}

export interface Spells {
    [key: string]: Spell;
}

export type Spell = MoveSpell | ProjectileSpell | SpraySpell | ScourgeSpell | ShieldSpell | TeleportSpell;

export interface SpellBase {
    id: string;
    action: string;

    chargeTicks?: number;
    cooldown: number;

    key?: string;
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
    turnRate?: number;

    maxTicks: number;
    explodeOn: number;

    trailTicks: number;

    color: string;
    render: string;
}

export interface BounceParameters {
    damageFactor: number;
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