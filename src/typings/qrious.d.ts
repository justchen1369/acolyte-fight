declare module "qrious" {
    class QRious {
        constructor(config: QRiousConfig)
    }

    interface QRiousConfig {
        element: HTMLCanvasElement;
        value: string;
        size?: number;
    }

    export default QRious;
}
