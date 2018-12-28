export function deltaPrecision(ratingDelta: number): string {
    let text: string;
    if (Math.abs(ratingDelta) < 1) {
        text = ratingDelta.toPrecision(1);
    } else {
        text = ratingDelta.toFixed(0);
    }
    if (ratingDelta > 0) {
        text = `+${text}`;
    }
    return text;
}