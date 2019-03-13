import pl from 'planck-js';
import * as React from 'react';
import * as ReactRedux from 'react-redux';

import * as processor from '../core/processor';
import * as replays from '../core/replays';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';

import { TicksPerSecond } from '../../game/constants';
import { CanvasStack, GraphicsLevel, render } from '../graphics/render';
import { VideoRecorder } from '../core/videoRecorder';

const FileSaver = require('../../lib/file-saver');

const Size = 1080;
const AfterSeconds = 2;
const DelayInterval = 16;

interface Props {
    gameId: string;
    server: string;
}
interface State {
    top: number;
    left: number;
    size: number;
}

function stateToProps(state: s.State): Props {
    return {
        gameId: state.current.gameId,
        server: state.current.server,
    };
}

function delay(milliseconds: number = DelayInterval): Promise<void> {
    return new Promise<void>(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

function nextFrame(): Promise<void> {
    return new Promise<void>(resolve => {
        window.requestAnimationFrame(() => resolve());
    });
}

async function recordVideo(replay: m.HeroMsg, canvasStack: CanvasStack) {
    console.log("Initialising recording...", replay.gameId);

    const videoRecorder = new VideoRecorder(canvasStack.gl);

    const remaining = [...replay.history];
    const world: w.World = processor.initialWorld(replay);


    while (remaining.length > 0 && !processor.isStartGameTick(remaining[0])) {
        processor.applyTick(remaining.shift(), world);
    }
    renderFrame(world, canvasStack);

    await videoRecorder.start();
    console.log("Recording started...", replay.gameId);

    const epoch = Date.now();
    const interval = Math.floor(1000 / TicksPerSecond);
    let index = 0;
    while (remaining.length > 0) {
        const target = Math.floor((Date.now() - epoch) / interval);
        if (index < target) {
            processor.applyTick(remaining.shift(), world);
            ++index;
        }

        renderFrame(world, canvasStack);
        if (world.winner && (world.tick - world.winTick) >= AfterSeconds * TicksPerSecond) {
            // Game is complete
            break;
        }

        await nextFrame();
    }

    console.log("Recording finished.", replay.gameId);
    await videoRecorder.stop();

    return videoRecorder.blob();
}

function renderFrame(world: w.World, canvasStack: CanvasStack) {
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

class CanvasPanel extends React.Component<Props, State> {
    private resizeListener = this.fullScreenCanvas.bind(this);
    private executed = false;

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
        };
    }

    componentWillMount() {
        window.addEventListener('resize', this.resizeListener);
        this.fullScreenCanvas();
        this.execute();
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.resizeListener);
    }

    render() {
        const style = { top: this.state.top, left: this.state.left, width: this.state.size, height: this.state.size };
        return (
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
        );
    }

    private fullScreenCanvas() {
        const clientWidth = document.body.clientWidth;
        const clientHeight = document.body.clientHeight;
        const size = Math.min(clientWidth, clientHeight);
        const left = Math.max(0, (clientWidth - size) / 2);
        const top = Math.max(0, (clientHeight - size) / 2);
        this.setState({ top, left, size });
    }

    private async execute() {
        if (this.executed) {
            return;
        } else {
            this.executed = true;
        }

        const replay = await replays.getReplay(this.props.gameId, this.props.server);
        const canvasStack = await this.waitForCanvas();
        const blob = await recordVideo(replay, canvasStack);
        FileSaver.saveAs(blob, `acolytefight-${replay.gameId}.webm`);
    }

    private async waitForCanvas(): Promise<CanvasStack> {
        while (true) {
            if (this.canvasStack.gl && this.canvasStack.ui) {
                return { ...this.canvasStack };
            }
            delay();
        }
    }
}

export default ReactRedux.connect(stateToProps)(CanvasPanel);