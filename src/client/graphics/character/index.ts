import _ from 'lodash';
import Color from 'color';
import * as pl from 'planck-js';
import * as h from '../../../game/character.model';
import * as vector from '../../../game/vector';

export function render(ctx: CanvasRenderingContext2D, pos: pl.Vec2, radius: number, skin: h.Skin, config: h.RenderSkinParams) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(radius, radius);

    // Stroke
    if (config.outlineFill) {
        ctx.lineWidth = config.outlineProportion || 0;
        ctx.strokeStyle = config.outlineFill;
        ctx.fillStyle = config.outlineFill;
        for (const layer of skin.layers) {
            ctx.save();

            applyTransform(ctx, layer.body.transform);

            ctx.beginPath();
            applyShape(ctx, layer.body.shape);
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }
    }

    // Fill
    for (const layer of skin.layers) {
        ctx.save();

        // Body
        if (config.bodyFill) {
            ctx.fillStyle = config.bodyFill;
        } else {
            ctx.fillStyle = 'transparent';
            ctx.globalCompositeOperation = 'destination-out';
        }
        applyTransform(ctx, layer.body.transform);

        ctx.beginPath();
        applyShape(ctx, layer.body.shape);
        ctx.fill();
        ctx.clip();

        ctx.globalCompositeOperation = 'source-over';

        // Glyphs
        if (config.glyphFill) {
            ctx.fillStyle = config.glyphFill;

            for (const glyph of layer.glyphs) {
                ctx.save();

                applyTransform(ctx, glyph.transform);

                ctx.beginPath();
                applyShape(ctx, glyph.shape);
                ctx.fill();

                ctx.restore();
            }
        }

        ctx.restore();
    }

    ctx.restore();
}

function applyTransform(ctx: CanvasRenderingContext2D, transform?: h.Transform) {
    if (transform) {
        ctx.translate(transform.rise || 0, 0);
        ctx.scale(transform.height || 1, transform.width || 1); // Yes this looks backwards, because we imagine the base at the bottom but it's not since 0 degrees points to the right
    }
}

function applyShape(ctx: CanvasRenderingContext2D, shape: h.Shape) {
    switch (shape.type) {
        case "circle": return applyCircle(ctx, shape);
        case "triangle": return applyTriangle(ctx, shape);
    }
}

function applyCircle(ctx: CanvasRenderingContext2D, shape: h.Circle) {
    ctx.arc(0, 0, 1, 0, vector.Tau);
}

function applyTriangle(ctx: CanvasRenderingContext2D, shape: h.Triangle) {
    // Comments are written as if the base is on the bottom, which it's not, it's on the left because 0 degrees points to the right

    ctx.moveTo(-1, -1); // Base left corner

    ctx.lineTo(1, -shape.peakSpan); // Peak left
    ctx.lineTo(1, shape.peakSpan); // Peak right

    ctx.lineTo(-1, 1); // Base right corner

    ctx.lineTo(-1, shape.indentSpan); // Indent right
    ctx.lineTo(-1 + shape.indentRise, 0); // Indent peak
    ctx.lineTo(-1, -shape.indentSpan); // Indent left

    ctx.closePath(); // Back to the base left corner
}