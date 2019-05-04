import pl from 'planck-js';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';

import * as StoreProvider from '../storeProvider';
import * as engine from '../../game/engine';
import * as vector from '../../game/vector';
import * as s from '../store.model';
import * as w from '../../game/world.model';

import { TicksPerSecond, Pixel } from '../../game/constants';
import { CanvasStack, GraphicsLevel, resetRenderState } from '../graphics/render';
import { frame } from '../core/ticker';
import { isMobile } from '../core/userAgent';

const MaxSlowFrames = 20;
const SlowFrameWaitInterval = 60;
const FpsThreshold = 0.9;

interface Props {
    world: w.World;
    wheelOnRight: boolean;
    noTargetingIndicator: boolean;
    noCameraFollow: boolean;
    mute: boolean;
    keyBindings: KeyBindings;
    rebindings: KeyBindings;
}
interface State {
    width: number;
    height: number;
    touchMultiplier: number;
    rtx: number;
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
    private numWaitFrames = 0;
    private timeOfLastFrame = 0;

    private numSlowFrames = 0;

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
}

function stateToProps(state: s.State): Props {
    return {
        world: state.world,
        wheelOnRight: state.options.wheelOnRight,
        noTargetingIndicator: state.options.noTargetingIndicator,
        noCameraFollow: state.options.noCameraFollow,
        mute: state.options.mute,
        keyBindings: state.keyBindings,
        rebindings: state.rebindings,
    };
}

class CanvasPanel extends React.PureComponent<Props, State> {
    private resizeListener = this.fullScreenCanvas.bind(this);

    private animationLoop = new AnimationLoop(
        () => this.frame(),
        () => this.reduceGraphics(),
    );

    private canvasStack: CanvasStack = {
        gl: null,
        ui: null,
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
            rtx: GraphicsLevel.Ultimate,
        };
    }

    componentWillMount() {
        window.addEventListener('resize', this.resizeListener);

        this.animationLoop.start();

        this.fullScreenCanvas();

    }

    componentWillUnmount() {
        this.animationLoop.stop();

        window.removeEventListener('resize', this.resizeListener);
    }

    reduceGraphics() {
        if (this.state.rtx > GraphicsLevel.Minimum) {
            const newLevel = this.state.rtx - 1;
            this.setState({ rtx: newLevel });
            console.log(`Reducing graphics level to ${newLevel} due to low framerate`);
        }
    }

    render() {
        let retinaMultiplier: number;
        if (this.state.rtx >= GraphicsLevel.Ultimate) {
            retinaMultiplier = window.devicePixelRatio;
        } else {
            retinaMultiplier = 1;
        }
        return (
            <div id="canvas-container" className={this.state.rtx ? "rtx-on" : "rtx-off"}>
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

    private frame() {
        if (this.canvasStack.gl && this.canvasStack.ui) {
            const resolvedKeys = this.resolveKeys(this.props);
            frame(this.canvasStack, this.props.world, {
                rtx: this.state.rtx,
                wheelOnRight: this.props.wheelOnRight,
                targetingIndicator: !this.props.noTargetingIndicator,
                cameraFollow: !this.props.noCameraFollow,
                mute: this.props.mute,
                keysToSpells: resolvedKeys.keysToSpells,
                rebindings: this.props.rebindings,
            });
        }
    }
}

export default ReactRedux.connect(stateToProps)(CanvasPanel);