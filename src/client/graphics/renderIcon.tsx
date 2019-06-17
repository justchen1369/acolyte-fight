export function renderIconButton(ctx: CanvasRenderingContext2D, icon: Path2D, color: string, alpha: number, size: number) {
    // Button
    {
        ctx.save();

        ctx.fillStyle = color;

        ctx.beginPath();
        ctx.rect(0, 0, size, size);
        ctx.fill();

        ctx.restore();
    }
    
    // Icon
    renderIconOnly(ctx, icon, alpha, size);
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