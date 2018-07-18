import pl from 'planck-js';
import * as React from 'react';
import * as w from '../game/world.model';

import { Spells, TicksPerSecond } from '../game/constants';
import { CanvasStack, sendAction, calculateWorldRect, whichKeyClicked, resetRenderState, notify, frame } from './facade';

interface Props {
    world: w.World;
}
interface State {
    width: number;
    height: number;
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
    private isMouseDown = false;
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
        window.addEventListener('keydown', this.keyUpListener);
        window.addEventListener('resize', this.resizeListener);

        this.animationLoop.start();

        this.fullScreenCanvas();

    }

    componentWillUnmount() {
        this.animationLoop.stop();

        window.removeEventListener('resize', this.resizeListener);
        window.removeEventListener('keydown', this.keyDownListener);
        window.removeEventListener('keydown', this.keyUpListener);
    }

    render() {
        return (
            <div id="game-panel">
                <canvas id="background" ref={c => this.canvasStack.background = c} className="game" width={this.state.width} height={this.state.height} />
                <canvas id="glows" ref={c => this.canvasStack.glows = c} className="game" width={this.state.width} height={this.state.height} />
                <canvas id="canvas" ref={c => this.canvasStack.canvas = c} className="game" width={this.state.width} height={this.state.height} />
                <canvas id="ui" ref={c => this.canvasStack.ui = c} className="game" width={this.state.width} height={this.state.height} 
                    onMouseMove={(ev) => this.canvasMouseMove(ev)}
                    onMouseEnter={(ev) => this.canvasMouseMove(ev)}
                    onTouchMove={(ev) => this.canvasTouch(ev)}
                    
                    onMouseDown={(ev) => {
                        this.isMouseDown = true;
                        this.canvasMouseMove(ev);
                    }}
                    onTouchStart={(ev) => {
                        this.isMouseDown = true;
                        this.canvasTouch(ev);
                    }}

                    onMouseLeave={(ev) => { this.isMouseDown = false; }}
                    onMouseUp={(ev) => { this.isMouseDown = false; }}
                    onTouchCancel={(ev) => { this.isMouseDown = false; }}
                    onTouchEnd={(ev) => { this.isMouseDown = false; }}

                    onContextMenu={(ev) => { ev.preventDefault() }}
                />
            </div>
        );
    }

    private canvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
        let rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        let interfacePoint = pl.Vec2((e.clientX - rect.left), (e.clientY - rect.top));
        const mouseDown = !!(e.buttons || e.button);

        this.canvasTouchHandler(interfacePoint, rect, mouseDown);
    }

    private canvasTouch(e: React.TouchEvent<HTMLCanvasElement>) {
        e.preventDefault();

        let rect = (e.target as HTMLCanvasElement).getBoundingClientRect();

        const handled = new Set<number>();
        for (let i = 0; i < e.changedTouches.length; ++i) { // Handled changed first - forces spells to go to current target
            const touch = e.changedTouches.item(i);
            if (!handled.has(touch.identifier)) {
                handled.add(touch.identifier);
                this.canvasSingleTouch(touch, rect);
            }
        }

        for (let i = 0; i < e.touches.length; ++i) {
            const touch = e.touches.item(i);
            if (!handled.has(touch.identifier)) {
                handled.add(touch.identifier);
                this.canvasSingleTouch(touch, rect);
            }
        }
    }

    private canvasSingleTouch(touch: Touch, rect: ClientRect) {
        let interfacePoint = pl.Vec2((touch.clientX - rect.left), (touch.clientY - rect.top));

        const mouseDown = true;
        this.canvasTouchHandler(interfacePoint, rect, mouseDown);
    }

    private canvasTouchHandler(interfacePoint: pl.Vec2, rect: ClientRect, mouseDown: boolean) {
        const world = this.props.world;

        if (!world.ui.myGameId || !world.ui.myHeroId){
            return;
        }

        let worldRect = calculateWorldRect(rect);
        let target = pl.Vec2((interfacePoint.x - worldRect.left) / worldRect.width, (interfacePoint.y - worldRect.top) / worldRect.height);

        if (mouseDown) {
            const key = whichKeyClicked(interfacePoint, world.ui.buttonBar);
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
                const spellId = world.ui.nextSpellId || "move";
                sendAction(world.ui.myGameId, world.ui.myHeroId, { type: spellId, target });
                world.ui.nextSpellId = null;
            }
        }

        this.nextTarget = target; // Set for next keyboard event
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
        if (spellType) {
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
        const world = this.props.world;

        if (!world.ui.myGameId || !world.ui.myHeroId) { return; }
        if (!this.nextTarget) { return; }

        if (this.isMouseDown) {
            sendAction(world.ui.myGameId, world.ui.myHeroId, { type: "move", target: this.nextTarget });
        }
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