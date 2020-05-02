import Color from 'color';
import ColTuple from './colorTuple';

let nextAge = 1; // start at 1 because 0 means never used before

const colorAges = new Map<string, number>();
const preferredColors = new Map<string, string>();

export function getPreferredColor(userHash: string) {
    return preferredColors.get(userHash);
}

export function setPreferredColor(userHash: string, color: string) {
    preferredColors.set(userHash, color);
}

export function takeColor(preferredColor: string, alreadyUsedColors: Set<string>, colors: string[]): string {
    if (preferredColor && !alreadyUsedColors.has(preferredColor)) {
        const index = colors.indexOf(preferredColor);
        if (index !== -1) {
            // Push to bottom of queue
            ageColor(preferredColor);
            return preferredColor;
        }
    }

    let oldestColor: string = null;
    let oldestAge: number = Infinity;
    for (let i = 0; i < colors.length; ++i) {
        const color = colors[i];
        if (alreadyUsedColors.has(color)) {
            continue;
        }

        const age = colorAges.get(color) || 0;
        if (age < oldestAge) {
            oldestColor = color;
            oldestAge = age;
        }
    }

    if (oldestColor) {
        ageColor(oldestColor);
        return oldestColor;
    } else {
        return null;
    }
}

function ageColor(color: string) {
    if (color) {
        colorAges.set(color, nextAge++);
    }
}

export function teamColor(baseColor: ColTuple): ColTuple {
    const color = baseColor.toColor();
    return ColTuple.fromColor(color.hue(color.hue() - 30 * Math.random()).darken(0.2 * Math.random()));
}