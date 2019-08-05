import defer from 'promise-defer';
let loading = defer<void>();

export function loaded() {
    return loading.promise;
}

export function unblock() {
    loading.resolve();
}