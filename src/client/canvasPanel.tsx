import pl from 'planck-js';
import * as React from 'react';
import * as vector from '../game/vector';
import * as w from '../game/world.model';

import { TicksPerSecond } from '../game/constants';
import { CanvasStack, sendAction, worldPointFromInterfacePoint, whichKeyClicked, touchControls, resetRenderState, frame } from './facade';

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

interface TargetSurfaceState {
    startWorldPoint: pl.Vec2;
    startTargetPoint: pl.Vec2;
}

interface ActionSurfaceState {
    touchId: string;
    activeKey: string;
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
    private actionSurface: ActionSurfaceState = null;
    private targetSurface: TargetSurfaceState = null;

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
                this.actionSurface = {
                    touchId: p.touchId,
                    activeKey: key,
                };
                this.handleButtonClick(key, world);
            } else {
                if (this.currentTouchId === null || this.currentTouchId === p.touchId) {
                    this.currentTouchId = p.touchId;

                    if (touchControls(world.ui.buttonBar)) {
                        world.ui.nextTarget = world.ui.nextTarget || pl.Vec2(0.5, 0.5);

                        this.targetSurface = {
                            startWorldPoint: world.ui.nextTarget,
                            startTargetPoint: p.worldPoint,
                        };
                    } else {
                        world.ui.nextTarget = p.worldPoint;
                    }
                }
            }
        });
        this.processCurrentTouch();
    }

    private handleButtonClick(key: string, world: w.World) {
        const spellId = this.keyToSpellId(key);
        const spell = world.settings.Spells[spellId];
        if (spell) {
            if (spell.untargeted || world.ui.nextTarget && touchControls(world.ui.buttonBar)) {
                sendAction(world.ui.myGameId, world.ui.myHeroId, { type: spellId, target: world.ui.nextTarget });
            } else {
                world.ui.nextSpellId = spellId;
            }
        }
    }

    private touchMoveHandler(...points: PointInfo[]) {
        const world = this.props.world;
        points.forEach(p => {
            if (this.actionSurface && this.actionSurface.touchId === p.touchId) {
                const key = whichKeyClicked(p.interfacePoint, world.ui.buttonBar);
                if (this.actionSurface.activeKey !== key) {
                    this.actionSurface.activeKey = key; // Ignore dragging on the same key
                    if (key) {
                        this.handleButtonClick(key, world);
                    }
                }
            } else if (this.currentTouchId === null || this.currentTouchId === p.touchId) {
                if (this.targetSurface) {
                    world.ui.nextTarget = vector.plus(this.targetSurface.startWorldPoint, vector.diff(p.worldPoint, this.targetSurface.startTargetPoint));
                } else {
                    world.ui.nextTarget = p.worldPoint;
                }
            }
        });
        this.processCurrentTouch();
    }

    private touchEndHandler(...points: PointInfo[]) {
        points.forEach(p => {
            if (this.actionSurface && this.actionSurface.touchId === p.touchId) {
                this.actionSurface = null;
            } else if (this.currentTouchId === p.touchId) {
                this.currentTouchId = null;
                this.targetSurface = null;
            } 
        });
        this.processCurrentTouch();
    }

    private processCurrentTouch() {
        const world = this.props.world;
        const Spells = world.settings.Spells;

        if (this.currentTouchId !== null && world.ui.nextTarget) {
            let spell = world.settings.Spells[world.ui.nextSpellId];
            if (!spell && (!this.actionSurface || this.actionSurface.activeKey === " ")) {
                spell = Spells.move;
            }
            if (spell) {
                sendAction(world.ui.myGameId, world.ui.myHeroId, { type: spell.id, target: world.ui.nextTarget });

                if (spell.id !== Spells.move.id) {
                    world.ui.nextSpellId = null;

                    if (spell.interruptible) {
                        // Stop responding to this touch, or else we will interrupt this spell by moving on the next tick
                        this.currentTouchId = null;
                    }
                }
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

        const spell = world.settings.Spells[spellId];
        if (!spell) { return null; }

        return spell.id;
    }

    private gameKeyUp(e: KeyboardEvent) {
        this.processCurrentTouch();
    }

    private readKey(e: KeyboardEvent) {
        switch (e.code) {
            case "KeyQ": return 'q';
            case "KeyW": return 'w';
            case "KeyE": return 'e';
            case "KeyR": return 'r';
            case "KeyT": return 't';
            case "KeyY": return 'y';
            case "KeyU": return 'u';
            case "KeyI": return 'i';
            case "KeyO": return 'o';
            case "KeyP": return 'p';
            case "KeyA": return 'a';
            case "KeyS": return 's';
            case "KeyD": return 'd';
            case "KeyF": return 'f';
            case "KeyG": return 'g';
            case "KeyH": return 'h';
            case "KeyJ": return 'j';
            case "KeyK": return 'k';
            case "KeyL": return 'l';
            case "KeyZ": return 'z';
            case "KeyX": return 'x';
            case "KeyC": return 'c';
            case "KeyV": return 'v';
            case "KeyB": return 'b';
            case "KeyN": return 'n';
            case "KeyM": return 'm';
            case "Digit0": return '0';
            case "Digit1": return '1';
            case "Digit2": return '2';
            case "Digit3": return '3';
            case "Digit4": return '4';
            case "Digit5": return '5';
            case "Digit6": return '6';
            case "Digit7": return '7';
            case "Digit8": return '8';
            case "Digit9": return '9';
            case "Minus": return '-';
            case "Equal": return '=';
            case "BracketLeft": return '[';
            case "BracketRight": return ']';
            case "Semicolon": return ';';
            case "Quote": return "'";
            case "Comma": return ',';
            case "Period": return '.';
            case "Space": return ' ';
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