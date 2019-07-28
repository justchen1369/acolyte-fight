declare module "promise-defer" {
    interface Deferred<T> {
        resolve: (value: T) => void;
        reject: (error: T) => void;
        promise: Promise<T>;
    } 

    export default function defer<T>(): Deferred<T>;
}