import Color from 'color';
import { HeroColors } from './constants';

let nextColors = [...HeroColors.Colors];

export function getColorQueue() {
    return nextColors;
}

export function takeColor(preferredColor: string): string {
    if (preferredColor) {
        const index = nextColors.indexOf(preferredColor);
        if (index !== -1) {
            // Push to bottom of queue
            delete nextColors[index];
            nextColors.push(preferredColor);
            return preferredColor;
        }
    }

    let color: string = null;
    while (!color) {
        color = nextColors.shift();
    }
    nextColors.push(color); // Requeue at bottom
    return color;
}

export function teamColor(baseColor: string): string {
    const color = Color(baseColor);
    return color.hue(color.hue() - 30 * Math.random()).darken(0.2 * Math.random()).string();
}