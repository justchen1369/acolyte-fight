import { HeroColors } from './constants';

let nextColors = [...HeroColors.Colors];

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

    const color = nextColors.shift();
    nextColors.push(color); // Requeue at bottom
    return color;
}