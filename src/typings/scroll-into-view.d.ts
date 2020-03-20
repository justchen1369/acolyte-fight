declare module "scroll-into-view" {
    interface ScrollConfig {
        time?: number;
        align?: AlignConfig;
    }

    interface AlignConfig {
        top?: number;
    }

    export default function scrollIntoView(elem: HTMLElement, config?: ScrollConfig): void;
}