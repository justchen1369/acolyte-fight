export function renderIcon(ctx: CanvasRenderingContext2D, icon: Path2D, color: string, size: number) {
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
    if (icon) {
        ctx.save();

        ctx.globalAlpha = 0.6;
        ctx.fillStyle = 'white';
        ctx.scale(size / 512, size / 512);
        ctx.fill(icon);

        ctx.restore();
    }
}