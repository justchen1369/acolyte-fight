import pl from 'planck-js';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';

import * as keyboardUtils from '../core/keyboardUtils';
import * as StoreProvider from '../storeProvider';
import * as engine from '../../game/engine';
import * as vector from '../../game/vector';
import * as s from '../store.model';
import * as w from '../../game/world.model';

import { TicksPerSecond, Pixel } from '../../game/constants';
import { CanvasStack, worldPointFromInterfacePoint, whichKeyClicked, touchControls, resetRenderState } from '../core/render';
import { sendAction } from '../core/sockets';
import { frame } from '../core/ticker';
import { isMobile } from '../core/userAgent';

const MouseId = "mouse";
const DoubleTapMilliseconds = 250;
const DoubleTapPixels = 100;
const LongPressMilliseconds = 250;
const FpsAlpha = 0.1;
const FpsThreshold = 0.75;

interface Props {
    world: w.World;
    wheelOnRight: boolean;
    mute: boolean;
    keyBindings: KeyBindings;
    rebindings: KeyBindings;
}
interface State {
    width: number;
    height: number;
    rtx: boolean;
}

interface PointInfo {
    touchId: string;
    interfacePoint: pl.Vec2;
    worldPoint: pl.Vec2;
    time: number;
    secondaryBtn?: boolean;
}

interface TargetSurfaceState {
    startWorldPoint: pl.Vec2;
    startTargetPoint: pl.Vec2;
}

interface ActionSurfaceState {
    touchId: string;
    activeKey: string;
    time: number;
}

interface TouchState {
    id: string;
    stack: number;
}

class AnimationLoop {
    private animate: () => void;
    private currentHandle = 0;
    private isRunning = false;

    private slow: () => void;
    private notifiedSlow = false;
    private fps = TicksPerSecond;
    private timeOfLastFrame = 0;

    constructor(animate: () => void, slow: () => void) {
        this.animate = animate;
        this.slow = slow;
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

        const timeOfThisFrame = Date.now();
        const renderingMilliseconds = timeOfThisFrame - this.timeOfLastFrame;
        if (renderingMilliseconds < 1000) {
            const newFps = 1000 / Math.max(1, renderingMilliseconds);
            this.fps = newFps * FpsAlpha + this.fps * (1 - FpsAlpha);

            if (!this.notifiedSlow && this.fps < FpsThreshold * TicksPerSecond) {
                this.notifiedSlow = true;
                this.slow();
            }
        }
        this.timeOfLastFrame = timeOfThisFrame;
        
        if (this.isRunning && this.currentHandle === handle) {
            window.requestAnimationFrame(() => this.loop(handle));
        }
    }
}

function stateToProps(state: s.State): Props {
    return {
        world: state.world,
        wheelOnRight: state.options.wheelOnRight,
        mute: state.options.mute,
        keyBindings: state.keyBindings,
        rebindings: state.rebindings,
    };
}

class CanvasPanel extends React.Component<Props, State> {
    private currentTouch: TouchState = null;
    private previousTouchStart: PointInfo = null;
    private actionSurface: ActionSurfaceState = null;
    private targetSurface: TargetSurfaceState = null;

    private leftClickKey: string;
    private rightClickKey: string;
    private singleTapKey: string;
    private doubleTapKey: string;

    private keyDownListener = this.gameKeyDown.bind(this);
    private resizeListener = this.fullScreenCanvas.bind(this);

    private animationLoop = new AnimationLoop(
        () => this.frame(),
        () => this.setState({ rtx: false }),
    );

    private canvasStack: CanvasStack = {
        background: null,
        glows: null,
        canvas: null,
        ui: null,
        cursor: null,
    };

    private resolveKeys = Reselect.createSelector(
        (props: Props) => props.keyBindings,
        (props: Props) => props.world.settings,
        (keyBindings, settings) => engine.resolveKeyBindings(keyBindings, settings)
    );

    constructor(props: Props) {
        super(props);
        this.state = {
            width: 0,
            height: 0,
            rtx: !isMobile,
        };

        this.leftClickKey = props.rebindings[w.SpecialKeys.LeftClick];
        this.rightClickKey = props.rebindings[w.SpecialKeys.RightClick];
        this.singleTapKey = props.rebindings[w.SpecialKeys.SingleTap];
        this.doubleTapKey = props.rebindings[w.SpecialKeys.DoubleTap];
    }

    componentWillMount() {
        window.addEventListener('keydown', this.keyDownListener);
        window.addEventListener('resize', this.resizeListener);

        this.animationLoop.start();

        this.fullScreenCanvas();

    }

    componentWillUnmount() {
        this.animationLoop.stop();

        window.removeEventListener('resize', this.resizeListener);
        window.removeEventListener('keydown', this.keyDownListener);
    }

    render() {
        return (
            <div id="canvas-container" className={this.state.rtx ? "rtx-on" : "rtx-off"}>
                <canvas id="background" ref={c => this.canvasStack.background = c} className="game" width={this.state.width} height={this.state.height} />
                <canvas id="glows" ref={c => this.canvasStack.glows = c} className="game" width={this.state.width} height={this.state.height} />
                <canvas id="canvas" ref={c => this.canvasStack.canvas = c} className="game" width={this.state.width} height={this.state.height} />
                <canvas id="ui" ref={c => this.canvasStack.ui = c} className="game" width={this.state.width} height={this.state.height} />
                <canvas id="cursor" ref={c => {
                    this.canvasStack.cursor = c;
                    if (c) { // React can't attach non-passive listeners, which means we can't prevent the pinch-zoom/scroll unless we do this
                        c.addEventListener("touchstart", (ev) => ev.preventDefault(), { passive: false });
                        c.addEventListener("touchmove", (ev) => ev.preventDefault(), { passive: false });
                    }
                }} className="game" width={this.state.width} height={this.state.height} 
                    onMouseDown={(ev) => this.touchStartHandler(this.takeMousePoint(ev))}
                    onMouseEnter={(ev) => this.touchMoveHandler(this.takeMousePoint(ev))}
                    onMouseMove={(ev) => this.touchMoveHandler(this.takeMousePoint(ev))}
                    onMouseLeave={(ev) => this.touchEndHandler(this.takeMousePoint(ev))}
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
        const secondaryBtn = !!e.button;
        return this.pointInfo(MouseId, e.target as HTMLCanvasElement, e.clientX, e.clientY, secondaryBtn);
    }

    private takeTouchPoint(e: React.TouchEvent<HTMLCanvasElement>): PointInfo[] {
        let points = new Array<PointInfo>();
        for (let i = 0; i < e.changedTouches.length; ++i) {
            const touch = e.changedTouches.item(i);
            points.push(this.pointInfo("touch" + touch.identifier, e.target as HTMLCanvasElement, touch.clientX, touch.clientY));
        }
        return points;
    }

    private pointInfo(touchId: string, elem: HTMLCanvasElement, clientX: number, clientY: number, secondaryBtn: boolean = false): PointInfo {
        const rect = elem.getBoundingClientRect();
        const interfacePoint = pl.Vec2((clientX - rect.left), (clientY - rect.top));
        const worldPoint = worldPointFromInterfacePoint(interfacePoint, rect);

        return {
            touchId,
            interfacePoint,
            worldPoint,
            time: Date.now(),
            secondaryBtn,
        };
    }

    private touchStartHandler(...points: PointInfo[]) {
        const world = this.props.world;
        if (!CanvasPanel.interactive(world)) {
            return;
        }

        points.forEach(p => {
            const key = whichKeyClicked(p.interfacePoint, world.ui.buttonBar);
            if (key) {
                this.actionSurface = {
                    touchId: p.touchId,
                    activeKey: key,
                    time: Date.now(),
                };
                if (p.secondaryBtn) {
                    this.handleCustomizeBtn(key);
                } else {
                    this.handleButtonClick(key, world);
                }
            } else {
                if (this.currentTouch === null || this.currentTouch.id === p.touchId) {
                    if (this.currentTouch) {
                        ++this.currentTouch.stack;
                    } else {
                        this.currentTouch = { id: p.touchId, stack: 1 };
                    }

                    if (touchControls(world.ui.buttonBar)) {
                        world.ui.nextTarget = world.ui.nextTarget || pl.Vec2(0.5, 0.5);

                        this.targetSurface = {
                            startWorldPoint: world.ui.nextTarget,
                            startTargetPoint: p.worldPoint,
                        };
                    } else {
                        world.ui.nextTarget = p.worldPoint;
                    }

                    if (isMobile) {
                        if (this.isDoubleClick(p)) {
                            if (this.doubleTapKey === undefined) {
                                this.autoBindDoubleTap();
                            }
                            this.handleButtonClick(this.doubleTapKey, world);
                        } else {
                            this.handleButtonClick(this.singleTapKey, world);
                        }
                    } else {
                        if (p.secondaryBtn) {
                            if (this.rightClickKey === undefined) {
                                this.autoBindRightClick(p.secondaryBtn);
                            }
                            this.handleButtonClick(this.rightClickKey, world);
                        } else {
                            this.handleButtonClick(this.leftClickKey, world);
                        }
                    }
                    this.previousTouchStart = p;
                }
            }
        });

        if (!world.ui.nextSpellId) {
            // Start of a touch will cancel any channelling spells
            world.ui.nextSpellId = w.Actions.MoveAndCancel;
        }
        this.processCurrentTouch();
    }

    private autoBindDoubleTap() {
        this.doubleTapKey = keyboardUtils.autoBindDoubleTap();
    }

    private autoBindRightClick(isRightClicking: boolean) {
        this.rightClickKey = keyboardUtils.autoBindRightClick(isRightClicking);
    }

    private isDoubleClick(p: PointInfo) {
        const doubleClick =
            this.previousTouchStart
            && (p.time - this.previousTouchStart.time) < DoubleTapMilliseconds
            && vector.distance(p.interfacePoint, this.previousTouchStart.interfacePoint) <= DoubleTapPixels
        return doubleClick;
    }

    private handleButtonClick(key: string, world: w.World) {
        if (!key) {
            return;
        }

        const spellId = this.keyToSpellId(key);
        const spell = world.settings.Spells[spellId];
        if (spell) {
            if (spell.untargeted || world.ui.nextTarget && touchControls(world.ui.buttonBar)) {
                sendAction(world.ui.myGameId, world.ui.myHeroId, { type: spellId, target: world.ui.nextTarget });
            } else {
                world.ui.nextSpellId = spellId;
            }
            this.notifyButtonPress();
        }
    }

    private notifyButtonPress() {
        try {
            if (navigator.vibrate) {
                navigator.vibrate(10);
            }
        } catch (ex) { }
    }

    private handleButtonHover(key: string, world: w.World) {
        const hoverSpellId = this.keyToSpellId(key);
        if (world.ui.hoverSpellId !== hoverSpellId) {
            StoreProvider.dispatch({ type: "updateHoverSpell", hoverSpellId, hoverBtn: key });
        }
    }

    private touchMoveHandler(...points: PointInfo[]) {
        const world = this.props.world;
        points.forEach(p => {
            if (this.actionSurface && this.actionSurface.touchId === p.touchId) {
                const key = whichKeyClicked(p.interfacePoint, world.ui.buttonBar);
                if (this.actionSurface.activeKey !== key) {
                    this.actionSurface.activeKey = key; // Ignore dragging on the same key
                    this.actionSurface.time = Date.now();
                    if (key) {
                        this.handleButtonClick(key, world);
                    }
                }
            } else if (this.currentTouch === null || this.currentTouch.id === p.touchId) {
                if (this.targetSurface) {
                    world.ui.nextTarget = vector.plus(this.targetSurface.startWorldPoint, vector.diff(p.worldPoint, this.targetSurface.startTargetPoint));
                } else {
                    world.ui.nextTarget = p.worldPoint;
                }
            }

            // Hover
            if (p.touchId === MouseId || (this.actionSurface && this.actionSurface.touchId === p.touchId)) {
                const key = whichKeyClicked(p.interfacePoint, world.ui.buttonBar);
                this.handleButtonHover(key, world);
            }
        });
        this.processCurrentTouch();
    }

    private touchEndHandler(...points: PointInfo[]) {
        points.forEach(p => {
            if (this.actionSurface && this.actionSurface.touchId === p.touchId) {
                this.actionSurface = null;
            } else if (this.currentTouch && this.currentTouch.id === p.touchId) {
                --this.currentTouch.stack;
                if (this.currentTouch.stack <= 0) {
                    this.currentTouch = null;
                    this.targetSurface = null;
                }
            } 
        });
        this.processCurrentTouch();
    }

    private processCurrentTouch() {
        const world = this.props.world;
        const Spells = world.settings.Spells;

        if (world.ui.nextTarget) {
            if (this.currentTouch !== null) {
                let spell = world.settings.Spells[world.ui.nextSpellId];
                if (!spell) {
                    spell = Spells.move;
                }
                if (spell) {
                    sendAction(world.ui.myGameId, world.ui.myHeroId, { type: spell.id, target: world.ui.nextTarget });

                    if (spell.id !== Spells.move.id) {
                        world.ui.nextSpellId = null;
                    }
                }
            } else {
                let spellId = this.keyToSpellId(this.rebind(w.SpecialKeys.Hover)) || w.Actions.Retarget;
                let target = world.ui.nextTarget;
                if (spellId === w.Actions.Move) {
                    const hero = world.objects.get(world.ui.myHeroId);
                    if (hero && hero.category === "hero") {
                        target = this.clampToArena(target, hero, world);
                    }
                }
                sendAction(world.ui.myGameId, world.ui.myHeroId, { type: spellId, target });
            }
        }
    }

    private clampToArena(target: pl.Vec2, hero: w.Hero, world: w.World) {
        const pos = hero.body.getPosition();
        const center = pl.Vec2(0.5, 0.5);
        const maxRadius = Math.max(0, world.radius - hero.radius - Pixel);
        if (vector.distance(pos, center) <= maxRadius) {
            return target;
        }

        if (vector.distance(target, center) <= maxRadius) {
            return target;
        }
        
        return vector.towards(center, target, maxRadius);
    }

    private handleLongProcessIfNecessary() {
        if (this.actionSurface) {
            const pressLength = Date.now() - this.actionSurface.time;
            if (pressLength >= LongPressMilliseconds) {
                const btn = this.actionSurface.activeKey;
                this.actionSurface.time += 1e9; // Don't repeat the long press
                this.handleCustomizeBtn(btn);
            }
        }
    }

    private handleCustomizeBtn(customizingBtn: string) {
        const world = this.props.world;
        if (engine.allowSpellChoosing(world, world.ui.myHeroId)) {
            StoreProvider.dispatch({ type: "customizeBtn", customizingBtn });
        }
    }

    private gameKeyDown(e: KeyboardEvent) {
        const world = this.props.world;
        if (!CanvasPanel.interactive(world)) {
            return;
        }

        if (e.repeat) {
            // Ignore repeats because they cancel channelling spells
            return;
        }

        const key = this.rebind(keyboardUtils.readKey(e));
        const spellType = this.keyToSpellId(key);
        const spell = world.settings.Spells[spellType];
        if (spell && world.ui.nextTarget) {
            sendAction(world.ui.myGameId, world.ui.myHeroId, { type: spellType, target: world.ui.nextTarget });
        }
    }

    private keyToSpellId(key: string): string {
        const world = this.props.world;

        if (!key) { return null; }

        const specialSpellId = world.settings.Choices.Special[key];
        if (specialSpellId) {
            return specialSpellId;
        }

        const hero = world.objects.get(world.ui.myHeroId);
        const keysToSpells = (hero && hero.category === "hero") ? hero.keysToSpells : this.resolveKeys(this.props).keysToSpells;

        const spellId = keysToSpells.get(key);
        if (!spellId) { return null; }

        const spell = world.settings.Spells[spellId];
        if (!spell) { return null; }

        return spell.id;
    }

    private rebind(key: string) {
        return this.props.rebindings[key] || key;
    }

    private static interactive(world: w.World) {
        const currentPlayer = world.players.get(world.ui.myHeroId);
        return currentPlayer && !currentPlayer.isBot;
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
            const resolvedKeys = this.resolveKeys(this.props);
            frame(this.canvasStack, this.props.world, {
                wheelOnRight: this.props.wheelOnRight,
                mute: this.props.mute,
                keysToSpells: resolvedKeys.keysToSpells,
                rebindings: this.props.rebindings,
            });
            this.handleLongProcessIfNecessary();
        }
    }
}

export default ReactRedux.connect(stateToProps)(CanvasPanel);