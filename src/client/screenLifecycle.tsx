import * as screenfull from 'screenfull';
import { isMobile } from './userAgent';

export function enterGame() {
    if (isMobile) {
        screenfull.request();
        lockLandscape();
    }
}

export function exitGame() {
    if (isMobile) {
        unlockLandscape();
        screenfull.exit();
    }
}

function lockLandscape() {
    const orientation = (window.screen as any).orientation;
    if (orientation && orientation.lock) {
        orientation.lock('landscape');
    }
}

function unlockLandscape() {
    const orientation = (window.screen as any).orientation;
    if (orientation && orientation.unlock) {
        orientation.unlock();
    }
}