import pl from 'planck-js';
import * as React from 'react';
import * as w from '../game/world.model';

import { TicksPerSecond } from '../game/constants';
import { Spells } from '../game/settings';
import { CanvasStack, sendAction, worldPointFromInterfacePoint, whichKeyClicked, resetRenderState, notify, frame } from './facade';

const MouseId = "mouse";

interface Props {
    world: w.World;
}
interface State {
    width: number;
    height: number;
}

interface PointInfo {
    touchId: string;
    interfacePoint: pl.Vec2;
    worldPoint: pl.Vec2;
}

class AnimationLoop {
    private animate: () => void;
    private currentHandle = 0;
    private isRunning = false;

    constructor(animate: () => void) {
        this.animate = animate;
    }

    start() {
        const handle = ++this.currentHandle;
        this.isRunning = true;
        window.requestAnimationFrame(() => this.loop(handle));
    }

    stop() {
        this.isRunning = false;
    }

    private loop(handle: number) {
        this.animate();
        if (this.isRunning && this.currentHandle === handle) {
            window.requestAnimationFrame(() => this.loop(handle));
        }
    }
}

export class CanvasPanel extends React.Component<Props, State> {
    private currentTouchId: string = null;

    private keyDownListener = this.gameKeyDown.bind(this);
    private keyUpListener = this.gameKeyUp.bind(this);
    private resizeListener = this.fullScreenCanvas.bind(this);

    private animationLoop = new AnimationLoop(() => this.frame());

    private canvasStack: CanvasStack = {
        background: null,
        glows: null,
        canvas: null,
        ui: null,
    };

    constructor(props: Props) {
        super(props);
        this.state = {
            width: 0,
            height: 0,
        };
    }

    componentWillMount() {
        window.addEventListener('keydown', this.keyDownListener);
        window.addEventListener('keyup', this.keyUpListener);
        window.addEventListener('resize', this.resizeListener);

        this.animationLoop.start();

        this.fullScreenCanvas();

    }

    componentWillUnmount() {
        this.animationLoop.stop();

        window.removeEventListener('resize', this.resizeListener);
        window.removeEventListener('keydown', this.keyDownListener);
        window.removeEventListener('keyup', this.keyUpListener);
    }

    render() {
        return (
            <div id="canvas-container">
                <canvas id="background" ref={c => this.canvasStack.background = c} className="game" width={this.state.width} height={this.state.height} />
                <canvas id="glows" ref={c => this.canvasStack.glows = c} className="game" width={this.state.width} height={this.state.height} />
                <canvas id="canvas" ref={c => this.canvasStack.canvas = c} className="game" width={this.state.width} height={this.state.height} />
                <canvas id="ui" ref={c => {
                    this.canvasStack.ui = c;
                    if (c) { // React can't attach non-passive listeners, which means we can't prevent the pinch-zoom/scroll unless we do this
                        c.addEventListener("touchstart", (ev) => ev.preventDefault(), { passive: false });
                        c.addEventListener("touchmove", (ev) => ev.preventDefault(), { passive: false });
                    }
                }} className="game" width={this.state.width} height={this.state.height} 
                    onMouseDown={(ev) => this.touchStartHandler(this.takeMousePoint(ev))}
                    onMouseEnter={(ev) => this.touchMoveHandler(this.takeMousePoint(ev))}
                    onMouseMove={(ev) => this.touchMoveHandler(this.takeMousePoint(ev))}
                    onMouseLeave={(ev) => this.touchMoveHandler(this.takeMousePoint(ev))}
                    onMouseUp={(ev) => this.touchEndHandler(this.takeMousePoint(ev))}

                    onTouchStart={(ev) => this.touchStartHandler(...this.takeTouchPoint(ev))}
                    onTouchMove={(ev) => this.touchMoveHandler(...this.takeTouchPoint(ev))}
                    onTouchEnd={(ev) => this.touchEndHandler(...this.takeTouchPoint(ev))}
                    onTouchCancel={(ev) => this.touchEndHandler(...this.takeTouchPoint(ev))}

                    onContextMenu={(ev) => { ev.preventDefault() }}
                />
            </div>
        );
    }

    private takeMousePoint(e: React.MouseEvent<HTMLCanvasElement>): PointInfo {
        return this.pointInfo(MouseId, e.target as HTMLCanvasElement, e.clientX, e.clientY);
    }

    private takeTouchPoint(e: React.TouchEvent<HTMLCanvasElement>): PointInfo[] {
        let points = new Array<PointInfo>();
        for (let i = 0; i < e.changedTouches.length; ++i) {
            const touch = e.changedTouches.item(i);
            points.push(this.pointInfo("touch" + touch.identifier, e.target as HTMLCanvasElement, touch.clientX, touch.clientY));
        }
        return points;
    }

    private pointInfo(touchId: string, elem: HTMLCanvasElement, clientX: number, clientY: number) {
        const rect = elem.getBoundingClientRect();
        const interfacePoint = pl.Vec2((clientX - rect.left), (clientY - rect.top));
        const worldPoint = worldPointFromInterfacePoint(interfacePoint, rect);

        return {
            touchId,
            interfacePoint,
            worldPoint,
        };
    }

    private touchStartHandler(...points: PointInfo[]) {
        const world = this.props.world;
        points.forEach(p => {
            const key = whichKeyClicked(p.interfacePoint, world.ui.buttonBar);
            if (key) {
                const spellId = this.keyToSpellId(key);
                const spell = (Spells as Spells)[spellId];
                if (spell) {
                    if (spell.untargeted) {
                        sendAction(world.ui.myGameId, world.ui.myHeroId, { type: spellId, target: world.ui.nextTarget });
                    } else {
                        world.ui.nextSpellId = spellId;
                    }
                }
            } else {
                if (this.currentTouchId === null || this.currentTouchId === p.touchId) {
                    this.currentTouchId = p.touchId;
                    world.ui.nextTarget = p.worldPoint;
                }
            }
        });
        this.processCurrentTouch();
    }

    private touchMoveHandler(...points: PointInfo[]) {
        const world = this.props.world;
        points.forEach(p => {
            if (this.currentTouchId === null || this.currentTouchId === p.touchId) {
                world.ui.nextTarget = p.worldPoint;
            }
        });
        this.processCurrentTouch();
    }

    private touchEndHandler(...points: PointInfo[]) {
        points.forEach(p => {
            if (this.currentTouchId === p.touchId) {
                this.currentTouchId = null;
            }
        });
        this.processCurrentTouch();
    }

    private processCurrentTouch() {
        const world = this.props.world;
        if (this.currentTouchId !== null && world.ui.nextTarget) {
            const spell = (Spells as Spells)[world.ui.nextSpellId] || Spells.move;
            sendAction(world.ui.myGameId, world.ui.myHeroId, { type: spell.id, target: world.ui.nextTarget });
            world.ui.nextSpellId = null;

            if (spell.id !== Spells.move.id && spell.interruptible) {
                // Stop responding to this touch, or else we will interrupt this spell by moving on the next tick
                this.currentTouchId = null;
            }
        }
    }

    private gameKeyDown(e: KeyboardEvent) {
        const world = this.props.world;
        const key = this.readKey(e);
        const spellType = this.keyToSpellId(key);
        if (spellType && world.ui.nextTarget) {
            sendAction(world.ui.myGameId, world.ui.myHeroId, { type: spellType, target: world.ui.nextTarget });
        }
    }

    private keyToSpellId(key: string): string {
        const world = this.props.world;

        if (!key) { return null; }

        const hero = world.objects.get(world.ui.myHeroId);
        if (!hero || hero.category !== "hero") { return null; }

        const spellId = hero.keysToSpells.get(key);
        if (!spellId) { return null; }

        const spell = (Spells as Spells)[spellId];
        if (!spell) { return null; }

        return spell.id;
    }

    private gameKeyUp(e: KeyboardEvent) {
        this.processCurrentTouch();
    }

    private readKey(e: KeyboardEvent) {
        switch (e.code) {
            case 'KeyQ': return 'q';
            case 'KeyW': return 'w';
            case 'KeyE': return 'e';
            case 'KeyR': return 'r';
            case 'KeyA': return 'a';
            case 'KeyS': return 's';
            case 'KeyD': return 'd';
            case 'KeyF': return 'f';
            default: return e.key && e.key.toLowerCase();
        }
    }

    private fullScreenCanvas() {
        const world = this.props.world;
        resetRenderState(world);
        this.setState({
            width: document.body.clientWidth,
            height: document.body.clientHeight,
        });
    }

    private frame() {
        if (this.canvasStack.background && this.canvasStack.canvas && this.canvasStack.glows && this.canvasStack.ui) {
            frame(this.canvasStack);
        }
    }
}