import pl from 'planck-js';
import * as AI from './ai.model';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as constants from '../../game/constants';
import * as engine from '../../game/engine';
import * as url from '../url';
import * as vector from '../../game/vector';
import * as StoreProvider from '../storeProvider';

const DefaultDelayMilliseconds = 400;

const workers = new Map<string, AiWorker>();
let workerCode: string = null;

export interface SendContext {
    action: (gameId: string, heroId: string, action: w.Action, controlKey: number) => void;
    spells: (gameId: string, heroId: string, keyBindings: KeyBindings, controlKey: number) => void;
}

export function onTick(world: w.World, send: SendContext) {
    if (!world.ui.myGameId) {
        return;
    }

    // Start any new bots
    if (world.ui.myHeroId) { // If not a replay
        world.players.forEach(player => startBotIfNecessary(world, player.heroId, player.controlKey, send));
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

function startBotIfNecessary(world: w.World, heroId: string, controlKey: number, send: SendContext) {
    if (isMyBot(world, heroId)) {
        const key = workerKey(world.ui.myGameId, heroId, controlKey);
        if (!workers.has(key)) {
            console.log("Starting bot", heroId);
            const worker = new AiWorker(world, heroId, controlKey, send);
            workers.set(key, worker);

            worker.start(); // Don't await
        }
    }
}

function workerKey(gameId: string, heroId: string, controlKey: number) {
    return `${gameId}/${heroId}/${controlKey}`;
}

function isMyBot(world: w.World, heroId: string) {
    if (!world.ui.myGameId) {
        return false;
    }

    if (world.winner) {
        // Stop botting after game complete
        return false;
    }

    const player = world.players.get(heroId);
    if (player && player.isBot && world.objects.has(heroId)) {
        return player.heroId === world.ui.myHeroId || player.isSharedBot;
    } else {
        return false;
    }
}

async function fetchWorkerCode() {
    if (workerCode) {
        return workerCode;
    }

    const res = await fetch(`${url.base}/dist/aiWorker.js`);
    workerCode = await res.text();
    return workerCode;
}

class AiWorker {
    private gameId: string;
    private heroId: string;
    private controlKey: number;
    private settings: AcolyteFightSettings;
    private send: SendContext;
    private worker: Worker;
    private awaitingTick: number = null;
    private isTerminated = false;

    constructor(world: w.World, heroId: string, controlKey: number, send: SendContext) {
        this.gameId = world.ui.myGameId;
        this.heroId = heroId;
        this.controlKey = controlKey;
        this.settings = world.settings;
        this.send = send;
    }

    async start() {
        try {
            this.worker = await this.createWorker();

            const code = this.settings.Code;
            const initMsg: AI.InitMsgContract = { type: "init", settings: this.settings, code };
            this.worker.postMessage(JSON.stringify(initMsg));
        } catch (exception) {
            console.error("Unable to start AI worker", exception);
            this.worker = null;
        }
    }

    private async createWorker() {
        const code = await fetchWorkerCode();
        const blobUrl = URL.createObjectURL(new Blob([code]));
        const worker = new Worker(blobUrl, { credentials: 'omit' });
        worker.onmessage = (ev) => this.onWorkerMessage(ev);
        return worker;
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

        if (this.awaitingTick) {
            // Only let the bot process one tick at a time
            return true;
        }

        if (!this.worker) {
            // Not ready to process any ticks yet
            return true;
        }


        let cooldowns: AI.CooldownsRemaining = {};
        hero.keysToSpells.forEach(spellId => {
            const next = hero.cooldowns[spellId] || 0;
            cooldowns[spellId] = Math.max(0, next - world.tick);
        });
        const stateMsg: AI.StateMsgContract = {
            type: "state",
            heroId: this.heroId,
            state: worldToState(world, this.heroId),
            cooldowns,
        };
        this.worker.postMessage(JSON.stringify(stateMsg));
        this.awaitingTick = stateMsg.state.tick;

        return true;
    }

    terminate() {
        console.log("Terminating bot", this.heroId);
        this.isTerminated = true;

        if (this.worker) {
            this.worker.terminate();
        }
    }

    private onWorkerMessage(ev: MessageEvent) {
        const message: AI.MsgContract = JSON.parse(ev.data);
        if (!message) {
            // Nothing to do
        } else if (message.type === "response") {
            if (this.awaitingTick === message.tick) {
                this.awaitingTick = null;
            }

            const output = message.output;
            if (output) {
                if (output.spells) {
                    const world = StoreProvider.getState().world;
                    if (engine.allowSpellChoosing(world, this.heroId)) {
                        this.send.spells(this.gameId, this.heroId, output.spells, this.controlKey);
                    }
                } else if (output.spellId) {
                    const world = StoreProvider.getState().world;
                    const spellsAllowed = engine.isGameStarting(world);
                    if (spellsAllowed || w.Actions.NonGameStarters.indexOf(output.spellId) !== -1) {
                        const delayMilliseconds = output.delayMilliseconds || DefaultDelayMilliseconds;
                        setTimeout(() => {
                            this.send.action(this.gameId, this.heroId, {
                                type: output.spellId,
                                target: pl.Vec2(output.target),
                                release: output.release,
                            }, this.controlKey);
                        }, delayMilliseconds);
                    }
                } 
            }
        }
    }
}

function worldToState(world: w.World, myHeroId: string): AI.World {
    const contract: AI.World = {
        tick: world.tick,
        started: world.tick >= world.startTick,
        heroes: {},
        projectiles: {},
        obstacles: {},
        radius: world.radius,
    };
    world.objects.forEach(obj => {
        if (obj.category === "hero") {
            const player = world.players.get(obj.id);
            const alliance = engine.calculateAlliance(myHeroId, obj.id, world);
            const invisible = engine.isHeroInvisible(obj);
            contract.heroes[obj.id] = {
                id: obj.id,
                isBot: player.isBot,
                isSelf: (alliance & constants.Alliances.Self) > 0,
                isAlly: (alliance & constants.Alliances.Ally) > 0,
                isEnemy: (alliance & constants.Alliances.Enemy) > 0,
                radius: obj.radius,
                pos: invisible ? invisible.initialPos : obj.body.getPosition(),
                velocity: obj.body.getLinearVelocity(),
                heading: obj.body.getAngle(),
                inside: engine.isInsideMap(obj.body.getPosition(), obj.radius, world),
                health: obj.health,
                link: obj.link ? {
                    spellId: obj.link.spellId,
                    targetId: obj.link.targetId,
                } : null,
                shieldTicksRemaining: 0,
                casting: obj.casting ? { 
                    spellId: obj.casting.action.type,
                } : null,
            };
        } else if (obj.category === "projectile") {
            contract.projectiles[obj.id] = {
                id: obj.id,
                pos: obj.body.getPosition(),
                velocity: obj.body.getLinearVelocity(),
                ownerId: obj.owner,
                spellId: obj.type,
                radius: obj.radius,
            };
        } else if (obj.category === "obstacle") {
            contract.obstacles[obj.id] = {
                id: obj.id,
                type: obj.type,
                pos: obj.body.getPosition(),
                velocity: obj.body.getLinearVelocity(),
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