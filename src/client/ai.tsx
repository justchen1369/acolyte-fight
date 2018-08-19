import * as w from '../game/world.model';
import * as vector from '../game/vector';
import { TicksPerSecond, TicksPerTurn } from '../game/constants';
import { Settings } from '../game/settings';

interface SendActionFunc {
    (gameId: string, heroId: string, action: w.Action): void;
}

const DefaultCodeUrl = "static/default.ai.acolytefight.js";

const workers = new Map<string, AiWorker>();

let code: string = null;
let sendAction: SendActionFunc = () => {};

export function attach(sendActionFunc: SendActionFunc) {
    sendAction = sendActionFunc;
}

export function getCode() {
    return code;
}

export function overwriteAI(_code: string) {
    code = _code;
}

export function resetAI() {
    code = null;
}

export function onTick(world: w.World) {
    if (!world.ui.myGameId) {
        return;
    }

    // Start any new bots
    if (world.ui.myHeroId) { // If not a replay
        world.bots.forEach(heroId => {
            const key = workerKey(world.ui.myGameId, heroId);
            if (!workers.has(key)) {
                workers.set(key, new AiWorker(world.ui.myGameId, heroId, createCodeUrl()));
            }
        });
    }

    // Process all bots
    const keysToDelete = new Array<string>();
    workers.forEach((worker, key) => {
        const keep = worker.tick(world);
        if (!keep) {
            keysToDelete.push(key);
        }
    });

    // Delete any finished bots
    keysToDelete.forEach(key => {
        workers.delete(key);
    });
}

function createCodeUrl() {
    if (code) {
        return `data:text/javascript;base64,${btoa(code)}`;
    } else {
        return DefaultCodeUrl;
    }
}

function workerKey(gameId: string, heroId: string) {
    return `${gameId}/${heroId}`;
}

class AiWorker {
    private gameId: string;
    private heroId: string;
    private worker: Worker;
    private isTerminated = false;

    constructor(gameId: string, heroId: string, codeUrl: string) {
        this.gameId = gameId;
        this.heroId = heroId;

        const worker = new Worker(codeUrl);
        worker.onmessage = (ev) => this.onWorkerMessage(ev);
        this.worker = worker;

        const initMsg: InitMsgContract = { type: "init", settings: Settings };
        worker.postMessage(JSON.stringify(initMsg));
    }

    /**
     * @returns whether to keep this worker or delete it
     */
    tick(world: w.World): boolean {
        if (this.isTerminated) {
            return false;
        }

        if (!world.ui.myGameId || !world.bots.has(this.heroId)) {
            this.terminate();
            return false;
        }

        const hero = world.objects.get(this.heroId);
        if (!(hero && hero.category === "hero")) {
            // Hero is dead
            this.terminate();
            return false;
        }

        let cooldowns: CooldownsRemainingContract = {};
        hero.keysToSpells.forEach(spellId => {
            const next = hero.cooldowns[spellId] || 0;
            cooldowns[spellId] = Math.max(0, next - world.tick);
        });
        const stateMsg: StateMsgContract = {
            type: "state",
            heroId: this.heroId,
            state: worldToState(world),
            cooldowns,
        };
        this.worker.postMessage(JSON.stringify(stateMsg));

        return true;
    }

    terminate() {
        this.isTerminated = true;
        this.worker.terminate();
    }

    private onWorkerMessage(ev: MessageEvent) {
        const message: MsgContract = JSON.parse(ev.data);
        if (message.type === "action") {
            sendAction(this.gameId, this.heroId, {
                type: message.action.spellId,
                target: message.action.target,
            });
        }
    }
}

function worldToState(world: w.World): WorldContract {
    const contract: WorldContract = {
        tick: world.tick,
        started: world.tick >= world.startTick,
        winner: world.winner,
        heroes: {},
        projectiles: {},
        obstacles: {},
        radius: world.radius,
        actions: {},
    };
    world.objects.forEach(obj => {
        if (obj.category === "hero") {
            contract.heroes[obj.id] = {
                id: obj.id,
                pos: obj.body.getPosition(),
                velocity: obj.body.getLinearVelocity(),
                heading: vector.fromAngle(obj.body.getAngle()),
                health: obj.health,
                shieldTicksRemaining: 0,
            };
        } else if (obj.category === "projectile") {
            contract.projectiles[obj.id] = {
                id: obj.id,
                pos: obj.body.getPosition(),
                velocity: obj.body.getLinearVelocity(),
                ownerId: obj.owner,
                spellId: obj.type,
                radius: obj.radius,
                damage: obj.damage,
                lifeSteal: obj.lifeSteal
            };
        } else if (obj.category === "obstacle") {
            contract.obstacles[obj.id] = {
                id: obj.id,
                pos: obj.body.getPosition(),
                velocity: obj.body.getLinearVelocity(),
                extent: obj.extent,
                numPoints: obj.points.length,
            };
        }
    });
    world.objects.forEach(shield => {
        if (shield.category === "shield") {
            const hero = contract.heroes[shield.owner];
            if (hero) {
                hero.shieldTicksRemaining = Math.max(0, shield.expireTick - world.tick);
            }
        }
    });
    world.actions.forEach((action: w.Action, heroId: string) => {
        contract.actions[heroId] = {
            spellId: action.type,
            target: action.target,
        };
    });
    return contract;
}