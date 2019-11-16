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