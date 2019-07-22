import pl from 'planck-js';
import * as React from 'react';
import * as ReactRedux from 'react-redux';

import * as audio from '../graphics/audio';
import * as matches from '../core/matches';
import * as pages from '../core/pages';
import * as processor from '../core/processor';
import * as recording from '../core/recording';
import * as replays from '../core/replays';
import * as StoreProvider from '../storeProvider';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';

import { TicksPerSecond, Atlas } from '../../game/constants';
import { CanvasStack, GraphicsLevel, render } from '../graphics/render';
import { VideoRecorder } from '../core/recording';

import UrlListener from '../controls/urlListener';

const FileSaver = require('../../lib/file-saver');

const Size = 1080;
const AfterSeconds = 2;
const TickInterval = Math.floor(1000 / TicksPerSecond);

interface CancellationToken {
    cancelled?: boolean;
}

interface Props {
    recordId: string;
    server: string;
    mute: boolean;
    sounds: Sounds;
}
interface State {
    top: number;
    left: number;
    size: number;

    progress: number;
    blob: Blob;
    complete: boolean;
    error: string;
}

function stateToProps(state: s.State): Props {
    return {
        recordId: state.current.recordId,
        server: state.current.server,
        mute: state.options.mute,
        sounds: state.world.settings.Sounds,
    };
}

function delay(milliseconds: number = TickInterval): Promise<void> {
    return new Promise<void>(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

function nextFrame(): Promise<void> {
    return new Promise<void>(resolve => {
        window.requestAnimationFrame(() => resolve());
    });
}

class CanvasPanel extends React.PureComponent<Props, State> {
    private resizeListener = this.fullScreenCanvas.bind(this);
    private executingToken: CancellationToken;

    private canvasStack: CanvasStack = {
        atlas: null,
        gl: null,
        ui: null,
    };

    constructor(props: Props) {
        super(props);
        this.state = {
            top: 0,
            left: 0,
            size: 0,
            progress: 0,
            blob: null,
            complete: false,
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
                    <i className="fa fa-chevron-left" /> {this.state.complete ? "Back to Home" : "Cancel"}
                </span>
                <div id="canvas-container">
                    <canvas
                        id="atlas" ref={c => this.canvasStack.atlas = c} className="atlas"
                        width={Atlas.Width} height={Atlas.Height} />
                    <canvas
                        id="gl" ref={c => this.canvasStack.gl = c} className="game"
                        width={Size} height={Size}
                        style={style} />
                    <canvas
                        id="ui" ref={c => this.canvasStack.ui = c} className="game"
                        width={Size} height={Size}
                        style={style} />
                </div>
                <div className="recording-status-panel">
                    {!this.state.complete && <div className="recording-status"><span className="recording">Recording video {(100 * this.state.progress).toFixed(0)}%</span> - do not switch tabs or minimise this window</div>}
                    {this.state.blob && <div className="recording-status">Recording complete - <a href="#" onClick={(ev) => this.onDownloadClicked(ev)}>click here to download your video if it has not already</a></div>}
                    {this.state.error && <div className="error">{this.state.error}</div>}
                </div>
                <UrlListener />
            </div>
        );
    }

    private onDownloadClicked(ev: React.MouseEvent) {
        ev.preventDefault();
        this.download();
    }

    private download() {
        if (this.state.blob) {
            FileSaver.saveAs(this.state.blob, `acolytefight-${this.props.recordId}.webm`);
        }
    }

    private onExitClicked() {
        recording.leaveRecording();
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
            if (!this.props.recordId) {
                return;
            }

            const replay = await replays.getReplay(this.props.recordId, this.props.server);
            const canvasStack = await this.waitForCanvas();
            const blob = await this.recordVideo(replay, canvasStack, token);

            this.setState({ blob, complete: true });

            this.download(); // Requires blob to be set in the state
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
        const remaining = [...replay.history];
        const world: w.World = processor.initialWorld(replay);
        console.log("Replay started...", world.ui.myGameId, world.ui.myUserHash);

        while (remaining.length > 0 && world.tick < world.startTick) {
            processor.applyTick(remaining.shift(), world);
        }
        this.renderFrame(world, canvasStack);

        if (token.cancelled) { throw token; }

        // Firefox cannot start capturing stream until Canvas has had getContext called on it, so do this here
        const videoStream = recording.recordCanvas(canvasStack.gl);
        let stream = videoStream;

        if (!this.props.mute) {
            const audioStream = audio.record();
            stream = new MediaStream([...videoStream.getTracks(), ...audioStream.getTracks()]);
        }

        const videoRecorder = new VideoRecorder(stream);
        try {
            await videoRecorder.start();
            console.log("Recording started...", replay.gameId);

            const numFrames = remaining.length;
            const epoch = Date.now();
            let index = 0;
            while (remaining.length > 0) {
                const target = Math.floor((Date.now() - epoch) / TickInterval);
                while (index < target) {
                    processor.applyTick(remaining.shift(), world);
                    ++index;
                }
                this.renderFrame(world, canvasStack);

                const progress = 1 - (remaining.length / numFrames);
                if (progress >= this.state.progress + 0.01) {
                    this.setState({ progress });
                }

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

            audio.unrecord();
        }

        return videoRecorder.blob();
    }

    private renderFrame(world: w.World, canvasStack: CanvasStack) {
        // Game is started
        render(world, canvasStack, {
            rtx: GraphicsLevel.Ultimate,
            wheelOnRight: false,
            targetingIndicator: false,
            cameraFollow: false,
            mute: this.props.mute,
            keysToSpells: new Map<string, string>(),
            rebindings: {},
            retinaMultiplier: 1,
        });
    }
}

export default ReactRedux.connect(stateToProps)(CanvasPanel);