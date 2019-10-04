let shard = 0;
let nextId = 1;

export function generate(): number {
    return ((shard << 24) ^ (nextId++));
}