export function loadScript(src: string) {
    return new Promise<void>((resolve, reject) => {
        const scriptTag = document.createElement("script");
        scriptTag.src = src;
        scriptTag.addEventListener('load', (ev) => {
            resolve();
        });
        scriptTag.addEventListener('error', () => {
            console.error("Error loading script", src);
            reject();
        });
        document.head.appendChild(scriptTag);
    });
}

