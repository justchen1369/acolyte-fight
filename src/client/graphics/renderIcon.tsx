import ColTuple from './colorTuple';

export function renderIconButton(ctx: CanvasRenderingContext2D, icon: Path2D, color: string, alpha: number, width: number, height: number) {
    const size = Math.min(width, height);

    ctx.save();

    // Button
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, ColTuple.parse(color).darken(0.2).string());
    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.fill();

    // Icon
    const left = (width - size) / 2;
    const top = (height - size) / 2;
    ctx.translate(left, top);
    renderIconOnly(ctx, icon, alpha, size);

    ctx.restore();
}

export function renderIconOnly(ctx: CanvasRenderingContext2D, icon: Path2D, alpha: number, size: number, color: string = 'white') {
    if (icon) {
        ctx.save();

        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.scale(size / 512, size / 512);
        ctx.fill(icon);

        ctx.restore();
    }
}