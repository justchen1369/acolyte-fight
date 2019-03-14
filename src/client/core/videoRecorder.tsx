interface CanvasSource {
    captureStream(): MediaStream;
}

interface MediaRecorderOpts {
    mimeType: string;
}

interface BlobEvent {
    data: BlobPart;
}

declare class MediaRecorder {
    static isTypeSupported(mimeType: string): boolean;

    constructor(stream: MediaStream, opts: MediaRecorderOpts);
    start(): void;
    stop(): void;

    ondataavailable: (e: BlobEvent) => void;
    onstart: (e: any) => void;
    onstop: (e: any) => void;
    onerror: (e: any) => void;
}

export class VideoRecorder {
    private stream: MediaStream;
    private recorder: MediaRecorder;
    private chunks = new Array<BlobPart>();

    private started = false;
    private stopped = false;

    constructor(canvas: HTMLCanvasElement) {
        try {
            const canvasSource = canvas as any as CanvasSource;
            this.stream = canvasSource.captureStream();
        } catch (exception) {
            console.error(exception);
            throw `Unable to capture video stream ${exception}`;
        }

        this.recorder = new MediaRecorder(this.stream, {
            mimeType: 'video/webm',
        });
        this.recorder.ondataavailable = (e) => {
            this.chunks.push(e.data);
        }
    }

    async start(): Promise<void> {
        if (this.started) {
            return;
        } else {
            this.started = true;
        }

        return new Promise<void>((resolve, reject) => {
            this.recorder.onstart = resolve;
            this.recorder.onerror = reject;
            this.recorder.start();
        }).then(() => {
            this.recorder.onstart = null;
            this.recorder.onerror = null;
        });
    }

    async stop(): Promise<void> {
        if (!this.started) {
            return; // Nothing to stop
        }

        if (this.stopped) {
            return;
        } else {
            this.stopped = true;
        }

        return new Promise<void>((resolve, reject) => {
            this.recorder.onstop = resolve;
            this.recorder.onerror = reject;
            this.recorder.stop();
        }).then(() => {
            this.recorder.onstop = null;
            this.recorder.onerror = null;
        });
    }

    blob(): Blob {
        return new Blob(this.chunks);
    }
}