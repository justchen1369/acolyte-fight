import Color from 'color';
const cache = new Map<string, Color>();

export function parseColor(str: string): Color {
    let color = cache.get(str);
    if (!color) {
        color = Color(str).rgb();
        cache.set(str, color);
    }
    return color;
}