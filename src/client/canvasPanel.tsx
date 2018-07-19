import pl from 'planck-js';
import * as React from 'react';
import * as w from '../game/world.model';

import { Spells, TicksPerSecond } from '../game/constants';
import { CanvasStack, sendAction, calculateWorldRect, whichKeyClicked, resetRenderState, notify, frame } from './facade';

const MouseId = -999;
const isSafari = navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1;

interface Props {
    world: w.World;
}
interface State {
    width: number;
    height: number;
}

interface PointInfo {
    touchId: number;
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
    private currentTouchId: number = null;
    private nextTarget: pl.Vec2 = null;
    private showedHelpText: boolean = false;

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
                    if (c) { // Why do I have to do this to prevent pinch zooming? Why isn't the normal event handlers enough?
                        c.addEventListener("touchstart", ev => ev.preventDefault());
                        c.addEventListener("touchmove", ev => ev.preventDefault());
                    }
                }} className="game" width={this.state.width} height={this.state.height} 
                    onMouseDown={(ev) => this.touchStartHandler(this.mousePoint(ev))}
                    onMouseEnter={(ev) => this.touchMoveHandler(this.mousePoint(ev))}
                    onMouseMove={(ev) => this.touchMoveHandler(this.mousePoint(ev))}
                    onMouseLeave={(ev) => this.touchMoveHandler(this.mousePoint(ev))}
                    onMouseUp={(ev) => this.touchEndHandler(this.mousePoint(ev))}

                    onTouchStart={(ev) => this.touchStartHandler(...this.touchPoints(ev))}
                    onTouchMove={(ev) => this.touchMoveHandler(...this.touchPoints(ev))}
                    onTouchEnd={(ev) => this.touchEndHandler(...this.touchPoints(ev))}
                    onTouchCancel={(ev) => this.touchEndHandler(...this.touchPoints(ev))}

                    onContextMenu={(ev) => { ev.preventDefault() }}
                />
            </div>
        );
    }

    private mousePoint(e: React.MouseEvent<HTMLCanvasElement>): PointInfo {
        return this.pointInfo(MouseId, e.target as HTMLCanvasElement, e.clientX, e.clientY);
    }

    private touchPoints(e: React.TouchEvent<HTMLCanvasElement>): PointInfo[] {
        let points = new Array<PointInfo>();
        for (let i = 0; i < e.changedTouches.length; ++i) {
            const touch = e.changedTouches.item(i);
            this.pointInfo(touch.identifier, e.target as HTMLCanvasElement, touch.clientX, touch.clientY);
        }
        return points;
    }

    private pointInfo(touchId: number, elem: HTMLCanvasElement, clientX: number, clientY: number) {
        const rect = elem.getBoundingClientRect();
        const interfacePoint = pl.Vec2((clientX - rect.left), (clientY - rect.top));
        const worldRect = calculateWorldRect(rect);
        const worldPoint = pl.Vec2((interfacePoint.x - worldRect.left) / worldRect.width, (interfacePoint.y - worldRect.top) / worldRect.height);

        return {
            touchId,
            interfacePoint,
            worldPoint,
        };
    }

    private touchStartHandler(...points: PointInfo[]) {
        points.forEach(p => {
            const world = this.props.world;
            const key = whichKeyClicked(p.interfacePoint, world.ui.buttonBar);
            if (key) {
                const spellId = this.keyToSpellId(key);
                const spell = Spells.all[spellId];
                if (spell) {
                    if (spell.untargeted) {
                        sendAction(world.ui.myGameId, world.ui.myHeroId, { type: spellId, target: this.nextTarget });
                    } else {
                        world.ui.nextSpellId = spellId;
                    }
                }
            } else {
                if (this.currentTouchId === null || this.currentTouchId === p.touchId) {
                    this.currentTouchId = p.touchId;
                    this.nextTarget = p.worldPoint;
                }
            }
        });
        this.processCurrentTouch();
    }

    private touchMoveHandler(...points: PointInfo[]) {
        points.forEach(p => {
            if (this.currentTouchId === null || this.currentTouchId === p.touchId) {
                this.nextTarget = p.worldPoint;
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
        if (this.currentTouchId !== null && this.nextTarget) {
            const spellId = world.ui.nextSpellId || "move";
            sendAction(world.ui.myGameId, world.ui.myHeroId, { type: spellId, target: this.nextTarget });
            world.ui.nextSpellId = null;
        }
    }

    private gameKeyDown(e: KeyboardEvent) {
        const world = this.props.world;

        if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "ArrowDown") {
            if (!this.showedHelpText) {
                this.showedHelpText = true;
                notify({ type: "help" });
            }
        }

        if (!world.ui.myGameId || !world.ui.myHeroId) { return; }

        const key = this.readKey(e);
        const spellType = this.keyToSpellId(key);
        if (spellType && this.nextTarget) {
            sendAction(world.ui.myGameId, world.ui.myHeroId, { type: spellType, target: this.nextTarget });
        }
    }

    private keyToSpellId(key: string): string {
        const world = this.props.world;

        if (!key) { return null; }

        const hero = world.objects.get(world.ui.myHeroId);
        if (!hero || hero.category !== "hero") { return null; }

        const spellId = hero.keysToSpells.get(key);
        if (!spellId) { return null; }

        const spell = Spells.all[spellId];
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