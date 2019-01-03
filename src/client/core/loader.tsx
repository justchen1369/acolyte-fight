let loadingPromise = Promise.resolve();

export function loaded() {
    return loadingPromise;
}

export function setLoadedPromise(promise: Promise<void>) {
    loadingPromise = promise;
}