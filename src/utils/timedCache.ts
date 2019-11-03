class CacheItem<V> {
    accessed: number = Date.now();

    constructor(public value: V) {
    }

    touch() {
        this.accessed = Date.now();
    }

    expired(expiryMilliseconds: number): boolean {
        return Date.now() >= this.accessed + expiryMilliseconds;
    }
}

export default class TimedCache<K, V> {
    private items = new Map<K, CacheItem<V>>();

    constructor(public expiryMilliseconds: number) {
    }

    get(key: K): V {
        const item = this.items.get(key);
        if (item) {
            if (item.expired(this.expiryMilliseconds)) {
                this.items.delete(key);
                return undefined;
            } else {
                item.touch();
                return item.value;
            }
        } else {
            return undefined;
        }
    }

    set(key: K, value: V): void {
        this.items.set(key, new CacheItem(value));
    }

    delete(key: K): void {
        this.items.delete(key);
    }

    forEach(callback: (value: V, key: K) => void) {
        this.items.forEach((item, key) => callback(item.value, key));
    }

    cleanup() {
        let cleaned = 0;
        this.items.forEach((item, key) => {
            if (item.expired(this.expiryMilliseconds)) {
                this.items.delete(key);
                ++cleaned;
            }
        });
        return cleaned;
    }
}