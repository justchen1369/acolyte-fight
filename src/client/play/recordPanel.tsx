import pl from 'planck-js';
import * as React from 'react';
import * as ReactRedux from 'react-redux';

import * as matches from '../core/matches';
import * as pages from '../core/pages';
import * as processor from '../core/processor';
import * as replays from '../core/replays';
import * as StoreProvider from '../storeProvider';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';

import { TicksPerSecond } from '../../game/constants';
import { CanvasStack, GraphicsLevel, render } from '../graphics/render';
import { VideoRecorder } from '../core/videoRecorder';

import UrlListener from '../controls/urlListener';

const FileSaver = require('../../lib/file-saver');

const Size = 1080;
const AfterSeconds = 2;
const TickInterval = Math.floor(1000 / TicksPerSecond);

interface CancellationToken {
    cancelled?: boolean;
}

interface Props {
    current: s.PathElements;
}
interface State {
    top: number;
    left: number;
    size: number;

    error: string;
}

function stateToProps(state: s.State): Props {
    return {
        current: state.current,
    };
}

function delay(milliseconds: number = TickInterval): Promise<void> {
    return new Promise<void>(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

function nextFrame(): Promise<void> {
    return new Promise<void>(resolve => {
        // Not using requestAnimationFrame because frame must be rendered for the video, even if window is minimised
        setTimeout(resolve, TickInterval);
    });
}

class CanvasPanel extends React.Component<Props, State> {
    private resizeListener = this.fullScreenCanvas.bind(this);
    private executingToken: CancellationToken;

    private canvasStack: CanvasStack = {
        gl: null,
        ui: null,
    };

    constructor(props: Props) {
        super(props);
        this.state = {
            top: 0,
            left: 0,
            size: 0,
            error: null,
        };
    }

    componentWillMount() {
        window.addEventListener('resize', this.resizeListener);
        this.fullScreenCanvas();

        if (!this.executingToken) {
            const token: CancellationToken = {};
            this.executingToken = token;
            this.execute(token);
        }
    }

    componentWillUnmount() {
        this.cancel();
        window.removeEventListener('resize', this.resizeListener);
    }

    render() {
        const style = { top: this.state.top, left: this.state.left, width: this.state.size, height: this.state.size };
        return (
            <div id="game-panel">
                <span className="nav-item exit-link" onClick={() => this.onExitClicked()}>
                    <i className="fa fa-chevron-left" /> Cancel
                </span>
                <div id="canvas-container">
                    <canvas
                        id="gl" ref={c => this.canvasStack.gl = c} className="game"
                        width={Size} height={Size}
                        style={style} />
                    <canvas
                        id="ui" ref={c => this.canvasStack.ui = c} className="game"
                        width={Size} height={Size}
                        style={style} />
                </div>
                <UrlListener />
            </div>
        );
    }

    private onExitClicked() {
        matches.leaveCurrentGame(true);
        pages.changePage("");
    }

    private fullScreenCanvas() {
        const clientWidth = document.body.clientWidth;
        const clientHeight = document.body.clientHeight;
        const size = Math.min(clientWidth, clientHeight);
        const left = Math.max(0, (clientWidth - size) / 2);
        const top = Math.max(0, (clientHeight - size) / 2);
        this.setState({ top, left, size });
    }

    private async execute(token: CancellationToken) {
        try {
            const current = this.props.current;
            const replay = await replays.getReplay(current.gameId, current.server);
            const canvasStack = await this.waitForCanvas();
            const blob = await this.recordVideo(replay, canvasStack, token);
            FileSaver.saveAs(blob, `acolytefight-${replay.gameId}.webm`);
        } catch (exception) {
            if (exception !== token) {
                console.error(exception);
                this.setState({
                    error: `${exception}`,
                });
            }
        }
    }

    private cancel() {
        if (this.executingToken) {
            this.executingToken.cancelled = true;
            this.executingToken = null;
        }
    }

    private async waitForCanvas(): Promise<CanvasStack> {
        while (true) {
            if (this.canvasStack.gl && this.canvasStack.ui) {
                return { ...this.canvasStack };
            }
            delay();
        }
    }

    private async recordVideo(replay: m.HeroMsg, canvasStack: CanvasStack, token: CancellationToken) {
        if (token.cancelled) { throw token; }

        console.log("Initialising recording...", replay.gameId);
        const videoRecorder = new VideoRecorder(canvasStack.gl);
        try {
            const remaining = [...replay.history];
            const world: w.World = processor.initialWorld(replay);

            while (remaining.length > 0 && !processor.isStartGameTick(remaining[0])) {
                processor.applyTick(remaining.shift(), world);
            }
            this.renderFrame(world, canvasStack);

            if (token.cancelled) { throw token; }

            await videoRecorder.start();
            console.log("Recording started...", replay.gameId);

            const epoch = Date.now();
            let index = 0;
            while (remaining.length > 0) {
                const target = Math.floor((Date.now() - epoch) / TickInterval);
                if (index < target) {
                    processor.applyTick(remaining.shift(), world);
                    ++index;
                }

                this.renderFrame(world, canvasStack);
                if (world.winner && (world.tick - world.winTick) >= AfterSeconds * TicksPerSecond) {
                    // Game is complete
                    break;
                }

                if (token.cancelled) { throw token; }
                await nextFrame();
            }
        } finally {
            console.log("Recording finished.", replay.gameId);
            await videoRecorder.stop();
        }

        return videoRecorder.blob();
    }

    private renderFrame(world: w.World, canvasStack: CanvasStack) {
        // Game is started
        render(world, canvasStack, {
            rtx: GraphicsLevel.Ultimate,
            wheelOnRight: false,
            targetingIndicator: false,
            mute: true,
            keysToSpells: new Map<string, string>(),
            rebindings: {},
        });
    }
}

export default ReactRedux.connect(stateToProps)(CanvasPanel);