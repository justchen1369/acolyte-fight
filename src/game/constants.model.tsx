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

export type Spell = MoveSpell | ProjectileSpell | SpraySpell | ScourgeSpell | ShieldSpell | TeleportSpell | ThrustSpell;

export interface SpellBase {
    id: string;
    description: string;
    action: string;

    chargeTicks?: number;
    cooldown: number;
    chargingUninterruptible?: boolean;
    channellingUninterruptible?: boolean;

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

    homing?: HomingParameters;

    maxTicks: number;
    collideWith?: number;
    explodeOn: number;

    trailTicks: number;

    color: string;
    render: string;
}

export interface BounceParameters {
    damageFactor: number;
}

export interface HomingParameters {
    ticksBeforeHoming: number;
    turnRate: number;
    boomerang?: true;
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