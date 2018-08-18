import * as w from '../game/world.model';
import * as facade from './facade';
import * as vector from '../game/vector';
import { TicksPerSecond, TicksPerTurn } from '../game/constants';
import { Settings } from '../game/settings';

let handler: AiHandler = null;

export function getCode(): string | null {
    if (handler) {
        return handler.getCode();
    } else {
        return null;
    }
}

export function attach(code: string) {
    detach();
    handler = new AiHandler(code);
}

export function detach() {
    if (!handler) { return; }
    handler.terminate();
    handler = null;
}

class AiHandler {
    private worker: Worker;
    private intervalHandle: NodeJS.Timer;
    private code: string;

    constructor(code: string) {
        this.code = code;

        const worker = new Worker(`data:text/javascript;base64,${btoa(code)}`);
        worker.onmessage = this.onWorkerMessage;
        this.worker = worker;

        this.intervalHandle = setInterval(() => this.onInterval(), (1000 / TicksPerSecond) * TicksPerTurn);

        const initMsg: InitMsgContract = { type: "init", settings: Settings };
        worker.postMessage(initMsg);
    }

    getCode() {
        return this.code;
    }

    terminate() {
        this.worker.terminate();
        clearInterval(this.intervalHandle);
    }

    private onInterval() {
        const world = facade.getCurrentWorld();
        if (!(world.ui.myGameId && world.ui.myHeroId)) {
            return;
        }

        const hero = world.objects.get(world.ui.myHeroId);
        if (!(hero && hero.category === "hero")) {
            return;
        }

        let cooldowns: CooldownsRemainingContract = {};
        hero.keysToSpells.forEach(spellId => {
            const next = hero.cooldowns[spellId] || 0;
            cooldowns[spellId] = Math.max(0, next - world.tick);
        });
        const stateMsg: StateMsgContract = {
            type: "state",
            gameId: world.ui.myGameId,
            heroId: world.ui.myHeroId,
            state: worldToState(world),
            cooldowns,
        };
        this.worker.postMessage(stateMsg);
    }

    private onWorkerMessage(ev: MessageEvent) {
        const message: MsgContract = ev.data;
        if (message.type === "action") {
            const world = facade.getCurrentWorld();
            if (world.ui.myGameId === message.gameId
                && world.ui.myHeroId === message.heroId
                && (world.tick >= world.startTick || message.action.spellId === "move")) {

                facade.sendAction(message.gameId, message.heroId, {
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
        started: world.tick >= world.startTick,
        winner: world.winner,
        heroes: [],
        projectiles: [],
        obstacles: [],
        radius: world.radius,
        actions: new Map<string, ActionContract>(),
    };
    world.objects.forEach(obj => {
        if (obj.category === "hero") {
            contract.heroes.push({
                id: obj.id,
                pos: obj.body.getPosition(),
                velocity: obj.body.getLinearVelocity(),
                heading: vector.fromAngle(obj.body.getAngle()),
                health: obj.health,
            });
        } else if (obj.category === "projectile") {
            contract.projectiles.push({
                id: obj.id,
                pos: obj.body.getPosition(),
                velocity: obj.body.getLinearVelocity(),
                ownerId: obj.owner,
                spellId: obj.type,
                radius: obj.radius,
                damage: obj.damage,
                lifeSteal: obj.lifeSteal
            });
        } else if (obj.category === "obstacle") {
            contract.obstacles.push({
                id: obj.id,
                pos: obj.body.getPosition(),
                velocity: obj.body.getLinearVelocity(),
                extent: obj.extent,
                numPoints: obj.points.length,
            });
        }
    });
    world.actions.forEach((action: w.Action, heroId: string) => {
        contract.actions.set(heroId, {
            spellId: action.type,
            target: action.target,
        });
    });
    return contract;
}