const ActiveMilliseconds = 5000; // Only consider a player active if they have interacted with the window within this much time
let lastActiveTimestamp = 0;

export function isActive() {
    const now = Date.now();
    const elapsed = now - lastActiveTimestamp;
    return elapsed < ActiveMilliseconds; // If playing, must be playing actively
}

export function touch() {
    lastActiveTimestamp = Date.now();
}