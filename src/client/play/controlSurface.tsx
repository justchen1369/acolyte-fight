import _ from 'lodash';
import classNames from 'classnames';
import pl from 'planck-js';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';

import * as keyboardUtils from '../core/keyboardUtils';
import * as StoreProvider from '../storeProvider';
import * as activated from '../core/activated';
import * as audio from '../audio/audio';
import * as engine from '../../game/engine';
import * as vector from '../../game/vector';
import * as s from '../store.model';
import * as w from '../../game/world.model';

import { worldPointFromInterfacePoint, whichKeyClicked, touchControls } from '../graphics/render';
import { sendActionXX } from '../core/ticker';

const MouseId = "mouse";
const DoubleTapMilliseconds = 250;
const DoubleTapPixels = 100;
const DefaultMaxTouchSurfaceSizeInPixels = 240;

interface Props {
    world: w.World;
    customizing: boolean;
    customizingBtn: boolean;
    buttonBarClickable: boolean;
    touchSurfacePixels: number;
    wheelOnRight: boolean;
    keyBindings: KeyBindings;
    rebindings: KeyBindings;
    touched: boolean;
}
interface State {
    touchMultiplier: number;
}

interface PointInfo {
    touchId: string;
    interfacePoint: pl.Vec2;
    worldPoint: pl.Vec2;
    time: number;
    secondaryBtn?: boolean;
    modifierBtn?: boolean;
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
    activeKey?: string;
}

function stateToProps(state: s.State): Props {
    return {
        world: state.world,
        customizing: state.customizing,
        customizingBtn: !!state.customizingBtn,
        buttonBarClickable: state.touched || !state.options.noRightClickChangeSpells,
        touchSurfacePixels: state.options.touchSurfacePixels,
        wheelOnRight: state.options.wheelOnRight,
        keyBindings: state.keyBindings,
        rebindings: state.rebindings,
        touched: state.touched,
    };
}

class ControlSurface extends React.PureComponent<Props, State> {
    private currentTouch: TouchState = null;
    private previousTouchStart: PointInfo = null;
    private actionSurface: ActionSurfaceState = null;
    private targetSurface: TargetSurfaceState = null;

    private leftClickKey: string;
    private rightClickKey: string;
    private singleTapKey: string;
    private doubleTapKey: string;

    private keyDownListener = this.gameKeyDown.bind(this);
    private keyUpListener = this.gameKeyUp.bind(this);
    private resizeListener = this.onResize.bind(this);

    private resolveKeys = Reselect.createSelector(
        (props: Props) => props.keyBindings,
        (props: Props) => props.world.settings,
        (keyBindings, settings) => engine.resolveKeyBindings(keyBindings, settings)
    );

    constructor(props: Props) {
        super(props);
        this.state = {
            touchMultiplier: 1,
        };

        this.leftClickKey = props.rebindings[w.SpecialKeys.LeftClick];
        this.rightClickKey = props.rebindings[w.SpecialKeys.RightClick];
        this.singleTapKey = props.rebindings[w.SpecialKeys.SingleTap];
        this.doubleTapKey = props.rebindings[w.SpecialKeys.DoubleTap];
    }

    componentDidMount() {
        window.addEventListener('keydown', this.keyDownListener);
        window.addEventListener('keyup', this.keyUpListener);
        window.addEventListener('resize', this.resizeListener);

        this.onResize();
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.resizeListener);
        window.removeEventListener('keydown', this.keyDownListener);
        window.removeEventListener('keyup', this.keyUpListener);
    }

    render() {
        const touched = this.props.touched;
        const className = classNames({
            'mobile': touched,
            'desktop': !touched,
            'wheel-on-left': touched && !this.props.wheelOnRight,
            'wheel-on-right': touched && this.props.wheelOnRight,
            'customizing': this.props.customizing,
        });
        return (
            <div
                id="game-panel"
                className={className}

                // If touched, we're going to receive duplicate events from the mouse, so ignore the mouse
                onMouseDown={(ev) => !touched && this.touchStartHandler(this.takeMousePoint(ev))}
                onMouseEnter={(ev) => !touched && this.touchMoveHandler(this.takeMousePoint(ev))}
                onMouseMove={(ev) => !touched && this.touchMoveHandler(this.takeMousePoint(ev))}
                onMouseLeave={(ev) => !touched && this.touchEndHandler(this.takeMousePoint(ev))}
                onMouseUp={(ev) => !touched && this.touchEndHandler(this.takeMousePoint(ev))}

                onTouchStart={(ev) => { this.onTouchStart(); this.touchStartHandler(...this.takeTouchPoint(ev)) }}
                onTouchMove={(ev) => this.touchMoveHandler(...this.takeTouchPoint(ev))}
                onTouchEnd={(ev) => this.touchEndHandler(...this.takeTouchPoint(ev))}
                onTouchCancel={(ev) => this.touchEndHandler(...this.takeTouchPoint(ev))}

                onContextMenu={(ev) => { ev.preventDefault() }}
                >
                {this.props.children}
            </div>
        );
    }

    private onTouchStart() {
        if (!this.props.touched) {
            StoreProvider.dispatch({ type: "touched", touched: true });
        }
    }


    private takeMousePoint(e: React.MouseEvent<HTMLElement>): PointInfo {
        const secondaryBtn = !!e.button;
        const modifierBtn = e.ctrlKey || e.shiftKey || e.altKey;
        return this.pointInfo(MouseId, e.clientX, e.clientY, secondaryBtn, modifierBtn);
    }

    private takeTouchPoint(e: React.TouchEvent<HTMLElement>): PointInfo[] {
        let points = new Array<PointInfo>();
        for (let i = 0; i < e.changedTouches.length; ++i) {
            const touch = e.changedTouches.item(i);
            points.push(this.pointInfo("touch" + touch.identifier, touch.clientX, touch.clientY));
        }
        return points;
    }

    private pointInfo(touchId: string, clientX: number, clientY: number, secondaryBtn: boolean = false, modifierBtn: boolean = false): PointInfo {
        const interfacePoint = pl.Vec2(clientX, clientY);
        const worldPoint = worldPointFromInterfacePoint(interfacePoint, this.props.world);

        return {
            touchId,
            interfacePoint,
            worldPoint,
            time: Date.now(),
            secondaryBtn,
            modifierBtn,
        };
    }

    private touchStartHandler(...points: PointInfo[]) {
        audio.unlock();
        activated.touch();

        const world = this.props.world;
        if (!ControlSurface.interactive(world)) {
            return;
        }

        let mapTouched = false;
        points.forEach(p => {
            const key = whichKeyClicked(p.interfacePoint, world.ui.buttonBar);
            if (key && (p.modifierBtn || this.props.buttonBarClickable)) {
                this.actionSurface = {
                    touchId: p.touchId,
                    activeKey: key,
                    time: Date.now(),
                };
                if (p.modifierBtn || (p.secondaryBtn && this.props.buttonBarClickable) || this.props.customizing) {
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

                    const usingTouch = touchControls(world.ui.buttonBar);
                    if (usingTouch) {
                        if (!world.ui.nextTarget) {
                            const hero = world.objects.get(world.ui.myHeroId);
                            if (hero) {
                                world.ui.nextTarget = hero.body.getPosition();
                            } else {
                                world.ui.nextTarget = pl.Vec2(0.5, 0.5);
                            }
                        }

                        this.targetSurface = {
                            startWorldPoint: world.ui.nextTarget,
                            startTargetPoint: p.worldPoint,
                        };
                    } else {
                        world.ui.nextTarget = p.worldPoint;
                    }

                    let key: string = null;
                    if (usingTouch) {
                        if (this.isDoubleClick(p)) {
                            if (this.doubleTapKey === undefined) {
                                this.autoBindDoubleTap();
                            }
                            key = this.doubleTapKey;
                        } else {
                            key = this.singleTapKey;
                        }
                    } else {
                        if (p.secondaryBtn) {
                            if (this.rightClickKey === undefined) {
                                this.autoBindRightClick(p.secondaryBtn);
                            }
                            key = this.rightClickKey;
                        } else {
                            if (!world.ui.nextSpellId) {
                                // If pressed the button bar, a left click should cast that spell, rather than cast what is normally bound to left click
                                key = this.leftClickKey;
                            }
                        }
                    }

                    if (key) {
                        this.handleButtonClick(key, world);
                        this.currentTouch.activeKey = key;
                    }

                    this.previousTouchStart = p;
                }

                mapTouched = true;
            }
        });

        if (!world.ui.nextSpellId) {
            // Start of a touch will cancel any channelling spells
            world.ui.nextSpellId = w.Actions.MoveAndCancel;
        }
        this.processCurrentTouch(true);

        if (mapTouched) {
            this.uncustomizeIfNecessary();
        }
    }

    private uncustomizeIfNecessary() {
        if (this.props.customizing) {
            StoreProvider.dispatch({ type: "customizing", customizing: false });
        }
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
        if (spell && !spell.passive) {
            if (spell.untargeted || world.ui.nextTarget && touchControls(world.ui.buttonBar)) {
                sendActionXX(world.ui.myGameId, world.ui.myHeroId, { type: spellId, target: world.ui.nextTarget });
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
        if (world.ui.toolbar.hoverSpellId !== hoverSpellId) {
            StoreProvider.dispatch({
                type: "updateToolbar",
                toolbar: { hoverSpellId, hoverBtn: key },
            });

            if (key && this.props.customizing) {
                this.handleCustomizeBtn(key);
            }
        }
    }

    private touchMoveHandler(...points: PointInfo[]) {
        activated.touch();

        const world = this.props.world;
        points.forEach(p => {
            if (this.actionSurface && this.actionSurface.touchId === p.touchId) {
                const key = whichKeyClicked(p.interfacePoint, world.ui.buttonBar);
                if (this.actionSurface.activeKey !== key) {
                    this.releaseKey(this.actionSurface.activeKey);
                    this.actionSurface.activeKey = key; // Ignore dragging on the same key
                    this.actionSurface.time = Date.now();
                    if (key) {
                        this.handleButtonClick(key, world);
                    }
                }
            } else if (this.currentTouch === null || this.currentTouch.id === p.touchId) {
                if (this.targetSurface) {
                    world.ui.nextTarget = vector.plus(
                        this.targetSurface.startWorldPoint,
                        vector.multiply(vector.diff(p.worldPoint, this.targetSurface.startTargetPoint), this.state.touchMultiplier * world.ui.camera.zoom));
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
        activated.touch();

        points.forEach(p => {
            if (this.actionSurface && this.actionSurface.touchId === p.touchId) {
                this.releaseKey(this.actionSurface.activeKey);
                this.actionSurface = null;
            } else if (this.currentTouch && this.currentTouch.id === p.touchId) {
                --this.currentTouch.stack;
                if (this.currentTouch.stack <= 0) {
                    this.releaseKey(this.currentTouch.activeKey);
                    this.currentTouch = null;
                    this.targetSurface = null;
                }
            } 
        });
        this.processCurrentTouch();
    }

    private processCurrentTouch(isNewTouch: boolean = false) {
        const world = this.props.world;
        const Spells = world.settings.Spells;

        if (world.ui.nextTarget) {
            if (this.currentTouch) {
                let spellId = w.Actions.Move;
                if (isNewTouch) {
                    if (world.ui.nextSpellId) {
                        spellId = world.ui.nextSpellId;
                        world.ui.nextSpellId = null;
                    }
                }

                let spell = Spells[spellId];
                if (spell && !spell.passive) {
                    sendActionXX(world.ui.myGameId, world.ui.myHeroId, { type: spell.id, target: world.ui.nextTarget });
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
                sendActionXX(world.ui.myGameId, world.ui.myHeroId, { type: spellId, target });
            }
        }
    }

    private clampToArena(target: pl.Vec2, hero: w.Hero, world: w.World) {
        if (this.props.customizing
            || this.props.customizingBtn
            || (world.ui.toolbar.hoverSpellId && this.props.buttonBarClickable)
            || world.ui.toolbar.hoverControl
            || world.ui.toolbar.hoverButtonPanel) {
            const pos = hero.body.getPosition();
            if (engine.allowSpellChoosing(world, world.ui.myHeroId)) {
                // User is choosing a spell now, don't move them
                return pos;
            }
        }

        return target;
    }

    private handleCustomizeBtn(customizingBtn: string) {
        StoreProvider.dispatch({
            type: "customizingBtn",
            customizingBtn,
        });
    }

    private gameKeyDown(e: KeyboardEvent) {
        e.stopPropagation(); // Stop Safari beeping in fullscreen mode
        e.preventDefault();

        const world = this.props.world;
        if (!ControlSurface.interactive(world)) {
            return;
        }

        if (e.repeat) {
            // Ignore repeats because they cancel channelling spells
            return;
        }

        const key = this.rebind(keyboardUtils.readKey(e));
        const spellType = this.keyToSpellId(key);
        const spell = world.settings.Spells[spellType];
        if (spell) { // Check this before customising as we can only customize valid keys
            if (e.ctrlKey || e.altKey || e.shiftKey) {
                this.handleCustomizeBtn(key);
            } else {
                if (!spell.passive && world.ui.nextTarget) {
                    sendActionXX(world.ui.myGameId, world.ui.myHeroId, { type: spellType, target: world.ui.nextTarget });
                }
            }
        }
    }
    
    private gameKeyUp(e: KeyboardEvent) {
        const world = this.props.world;
        if (e.repeat) {
            // Ignore repeats because they cancel channelling spells
            return;
        }

        const key = this.rebind(keyboardUtils.readKey(e));
        this.releaseKey(key);
    }

    private releaseKey(key: string) {
        if (!key) {
            return;
        }

        const world = this.props.world;
        if (!ControlSurface.interactive(world)) {
            return;
        }

        const spellType = this.keyToSpellId(key);
        const spell = world.settings.Spells[spellType];
        if (spell && spell.release) {
            if (!spell.passive && world.ui.nextTarget) {
                sendActionXX(world.ui.myGameId, world.ui.myHeroId, { type: spellType, target: world.ui.nextTarget, release: true });
            }
        }
    }

    private keyToSpellId(key: string): string {
        return this.keyToNonSpecialKey(key) || this.keyToSpecialKey(key);
    }

    private keyToSpecialKey(key: string): string {
        const world = this.props.world;

        if (!key) { return null; }

        const specialSpellId = world.settings.Choices.Special[key];
        if (specialSpellId) {
            return specialSpellId;
        }

        return null;
    }

    private keyToNonSpecialKey(key: string): string {
        const world = this.props.world;

        if (!key) { return null; }

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

    private onResize() {
        const screenSize = Math.min(document.body.clientWidth, document.body.clientHeight);
        const touchSize = Math.max(1, Math.min(this.props.touchSurfacePixels || DefaultMaxTouchSurfaceSizeInPixels, screenSize));
        const touchMultiplier = screenSize / touchSize;
        this.setState({
            touchMultiplier,
        });
    }
}

export default ReactRedux.connect(stateToProps)(ControlSurface);