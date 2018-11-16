import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as engine from '../../game/engine';
import * as vector from '../../game/vector';
import * as StoreProvider from '../storeProvider';
import { sendAction } from './sockets';

const DefaultCodeUrl = "static/default.ai.acolytefight.js";

const workers = new Map<string, AiWorker>();

setInterval(() => onTick(StoreProvider.getState().world), 100);

export function playingAsAI(store: s.State = null) {
    store = store || StoreProvider.getState();
    return !!store.aiCode;
}

export function onTick(world: w.World) {
    if (!world.ui.myGameId) {
        return;
    }

    // Start any new bots
    if (world.ui.myHeroId) { // If not a replay
        world.players.forEach(player => startBotIfNecessary(world, player.heroId));
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

function startBotIfNecessary(world: w.World, heroId: string) {
    if (isMyBot(world, heroId)) {
        const key = workerKey(world.ui.myGameId, heroId);
        if (!workers.has(key)) {
            console.log("Starting bot", heroId);
            const allowCustomCode = heroId === world.ui.myHeroId;
            workers.set(key, new AiWorker(world, heroId, createCodeUrl(allowCustomCode)));
        }
    }
}

function createCodeUrl(allowCustomCode: boolean) {
    const store = StoreProvider.getState();
    if (store.aiCode && allowCustomCode) {
        return `data:text/javascript;base64,${btoa(store.aiCode)}`;
    } else {
        return DefaultCodeUrl;
    }
}

function workerKey(gameId: string, heroId: string) {
    return `${gameId}/${heroId}`;
}

function isMyBot(world: w.World, heroId: string) {
    if (!world.ui.myGameId) {
        return false;
    }

    const player = world.players.get(heroId);
    if (player && player.isBot && world.objects.has(heroId)) {
        return player.heroId === world.ui.myHeroId || player.isSharedBot;
    } else {
        return false;
    }
}

class AiWorker {
    private gameId: string;
    private heroId: string;
    private worker: Worker;
    private isTerminated = false;

    constructor(world: w.World, heroId: string, codeUrl: string) {
        this.gameId = world.ui.myGameId;
        this.heroId = heroId;

        const worker = new Worker(codeUrl);
        worker.onmessage = (ev) => this.onWorkerMessage(ev);
        this.worker = worker;

        const initMsg: InitMsgContract = { type: "init", settings: world.settings };
        worker.postMessage(JSON.stringify(initMsg));
    }

    /**
     * @returns whether to keep this worker or delete it
     */
    tick(world: w.World): boolean {
        if (this.isTerminated) {
            return false;
        }

        if (!isMyBot(world, this.heroId)) {
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
        if (!message) {
            // Nothing to do
        } else if (message.type === "action") {
            const world = StoreProvider.getState().world;
            const spellsAllowed = engine.hasGamePrestarted(world);
            if (message.action.spellId === "move" || spellsAllowed) {
                sendAction(this.gameId, this.heroId, {
                    type: message.action.spellId,
                    target: message.action.target,
                });
            }
        }
    }
}

function worldToState(world: w.World): WorldContract {
    const contract: WorldContract = {
        tick: world.tick,
        prestarted: engine.hasGamePrestarted(world),
        started: world.tick >= world.startTick,
        heroes: {},
        projectiles: {},
        obstacles: {},
        radius: world.radius,
    };
    world.objects.forEach(obj => {
        if (obj.category === "hero") {
            contract.heroes[obj.id] = {
                id: obj.id,
                radius: obj.radius,
                pos: obj.body.getPosition(),
                velocity: obj.body.getLinearVelocity(),
                heading: vector.fromAngle(obj.body.getAngle()),
                health: obj.health,
                linkedToId: obj.link ? obj.link.targetId : null,
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
    return contract;
}