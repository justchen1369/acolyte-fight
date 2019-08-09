import pl from 'planck-js';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';

import * as StoreProvider from '../storeProvider';
import * as engine from '../../game/engine';
import * as vector from '../../game/vector';
import * as s from '../store.model';
import * as w from '../../game/world.model';

import { TicksPerSecond, Atlas } from '../../game/constants';
import { CanvasStack, GraphicsLevel, resetRenderState } from '../graphics/render';
import { frame } from '../core/ticker';
import { isMobile } from '../core/userAgent';

const HiddenRenderTimeoutMiliseconds = 1000;
const MaxSlowFrames = 10;
const SlowFrameWaitInterval = 60;
const FpsThreshold = 0.9;

interface Props {
    world: w.World;
    wheelOnRight: boolean;
    noTargetingIndicator: boolean;
    noCameraFollow: boolean;
    graphics?: number;
    keyBindings: KeyBindings;
    rebindings: KeyBindings;
}
interface State {
    width: number;
    height: number;
    touchMultiplier: number;
    rtx: number;
}

class AnimationLoop {
    private animate: (display: boolean) => void;
    private currentHandle = 0;
    private currentInterval: number = null;
    private isRunning = false;

    private slow: () => void;
    private numWaitFrames = 0;
    private timeOfLastFrame = 0;

    private numSlowFrames = 0;

    constructor(animate: (display: boolean) => void, slow: () => void) {
        this.animate = animate;
        this.slow = slow;
    }

    start() {
        if (this.isRunning) {
            console.error("AnimationLoop.start() called when already started");
            return;
        }

        const handle = ++this.currentHandle;
        this.isRunning = true;
        window.requestAnimationFrame(() => this.loop(handle));
        this.currentInterval = window.setInterval(() => this.hiddenRenderLoop(), HiddenRenderTimeoutMiliseconds);
    }

    stop() {
        window.clearInterval(this.currentInterval);
        this.isRunning = false;
        this.currentInterval = null;
    }

    private loop(handle: number) {
        this.animate(true);

        const timeOfThisFrame = Date.now();
        const renderingMilliseconds = timeOfThisFrame - this.timeOfLastFrame;
        if (this.numWaitFrames > 0) {
            --this.numWaitFrames;
        } else if (renderingMilliseconds < 1000) {
            const targetMilliseconds = 1000 / TicksPerSecond;
            const isSlow = renderingMilliseconds > targetMilliseconds / FpsThreshold;
            if (isSlow) {
                ++this.numSlowFrames;
            } else {
                this.numSlowFrames = 0;
            }

            if (this.numSlowFrames >= MaxSlowFrames) {
                this.numSlowFrames = 0;
                this.numWaitFrames = SlowFrameWaitInterval;
                this.slow();
            }
        }
        this.timeOfLastFrame = timeOfThisFrame;
        
        if (this.isRunning && this.currentHandle === handle) {
            window.requestAnimationFrame(() => this.loop(handle));
        }
    }

    private hiddenRenderLoop() {
        const renderAge = Date.now() - this.timeOfLastFrame;
        if (renderAge >= HiddenRenderTimeoutMiliseconds) {
            this.animate(false);
        }
    }
}

function stateToProps(state: s.State): Props {
    return {
        world: state.world,
        wheelOnRight: state.options.wheelOnRight,
        noTargetingIndicator: state.options.noTargetingIndicator,
        noCameraFollow: state.options.noCameraFollow,
        graphics: state.options.graphics,
        keyBindings: state.keyBindings,
        rebindings: state.rebindings,
    };
}

function autoGraphics(graphics: number) {
    return !graphics;
}

class CanvasPanel extends React.PureComponent<Props, State> {
    private resizeListener = this.fullScreenCanvas.bind(this);

    private animationLoop = new AnimationLoop(
        (display: boolean) => this.frame(display),
        () => this.reduceGraphics(),
    );

    private canvasStack: CanvasStack = {
        gl: null,
        ui: null,
        atlas: null,
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
            touchMultiplier: 1,
            rtx: GraphicsLevel.Maximum,
        };
    }

    componentDidMount() {
        window.addEventListener('resize', this.resizeListener);

        this.animationLoop.start();

        this.fullScreenCanvas();

    }

    componentWillUnmount() {
        this.animationLoop.stop();

        window.removeEventListener('resize', this.resizeListener);
    }

    reduceGraphics() {
        if (!autoGraphics(this.props.graphics) && this.state.rtx > GraphicsLevel.Low) {
            const newLevel = this.state.rtx - 1;
            this.setState({ rtx: newLevel });
            console.log(`Reducing graphics level to ${newLevel} due to low framerate`);
        }
    }

    render() {
        const retinaMultiplier = this.calculateRetinaMultiplier();
        return (
            <div
                id="canvas-container"
                className={this.state.rtx ? "rtx-on" : "rtx-off"}

                ref={c => {
                    if (c) { // React can't attach non-passive listeners, which means we can't prevent the pinch-zoom/scroll unless we do this
                        c.addEventListener("touchstart", (ev) => ev.preventDefault(), { passive: false });
                        c.addEventListener("touchmove", (ev) => ev.preventDefault(), { passive: false });
                    }
                }}
                >

                <canvas
                    id="atlas" ref={c => this.canvasStack.atlas = c} className="atlas"
                    width={Atlas.Width} height={Atlas.Height}
                />

                <canvas
                    id="gl" ref={c => this.canvasStack.gl = c} className="game"
                    width={Math.round(this.state.width * retinaMultiplier)} height={Math.round(this.state.height * retinaMultiplier)}
                    style={{ width: this.state.width, height: this.state.height }}
                />
                <canvas
                    id="ui"
                    ref={c => {
                        this.canvasStack.ui = c;
                    }}
                    className="game" width={this.state.width} height={this.state.height} 
                />
            </div>
        );
    }

    private fullScreenCanvas() {
        const world = this.props.world;
        resetRenderState(world);

        this.setState({
            width: document.body.clientWidth,
            height: document.body.clientHeight,
        });
    }

    private calculateRetinaMultiplier() {
        if (this.state.rtx >= GraphicsLevel.Maximum) {
            return window.devicePixelRatio;
        } else {
            return 1;
        }
    }

    private frame(display: boolean) {
        if (this.canvasStack.atlas && this.canvasStack.gl && this.canvasStack.ui) {
            const resolvedKeys = this.resolveKeys(this.props);
            frame(this.canvasStack, this.props.world, {
                rtx: this.props.graphics || this.state.rtx,
                wheelOnRight: this.props.wheelOnRight,
                targetingIndicator: !this.props.noTargetingIndicator,
                cameraFollow: !this.props.noCameraFollow,
                keysToSpells: resolvedKeys.keysToSpells,
                rebindings: this.props.rebindings,
                retinaMultiplier: this.calculateRetinaMultiplier(),
            });
        }
    }
}

export default ReactRedux.connect(stateToProps)(CanvasPanel);