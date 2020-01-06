import _ from 'lodash';
import * as pl from 'planck-js';
import * as h from './character.model';
import * as vector from '../../../game/vector';

export function renderBody(ctx: CanvasRenderingContext2D, pos: pl.Vec2, radius: number, skin: h.Skin) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(radius, radius);

    applyStyle(ctx, skin.body);

    ctx.beginPath();
    applyBodyPath(ctx, skin.body);
    ctx.stroke();
    ctx.fill();

    ctx.restore();
}

export function renderGlyph(ctx: CanvasRenderingContext2D, pos: pl.Vec2, radius: number, skin: h.Skin) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(radius, radius);

    applyStyle(ctx, skin.glyph);

    // Clip to body
    ctx.beginPath();
    applyBodyPath(ctx, skin.body);
    ctx.clip();

    // Glyph
    ctx.beginPath();
    applyGlyphPath(ctx, skin.glyph);
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
}

function applyStyle(ctx: CanvasRenderingContext2D, style: h.Style) {
    ctx.lineWidth = 2 * (style.stroke || 0); // 2x because we only keep the outside half of the stroke
    ctx.strokeStyle = style.strokeMask || '#0000';
    ctx.fillStyle = style.fillMask || '#fff';
}

function applyGlyphPath(ctx: CanvasRenderingContext2D, glyph: h.Glyph) {
    const points = [
        pl.Vec2(glyph.inflect, 0),
        pl.Vec2(-glyph.fall, -glyph.span),
        pl.Vec2(-glyph.attack, -glyph.span),
        pl.Vec2(glyph.rise, 0),
        pl.Vec2(-glyph.attack, glyph.span),
        pl.Vec2(-glyph.fall, glyph.span),
    ];
    applyPath(ctx, points);
}

function applyBodyPath(ctx: CanvasRenderingContext2D, body: h.Body) {
    if (body.numPoints >= 3) {
        const bend = body.bend;
        const extentMultiplier = 1 / Math.max(0.5, Math.sqrt(bend));
        applyQuadraticPath(ctx, bend, calculateRadialPolygonPoints(body.numPoints, extentMultiplier));
    } else {
        ctx.arc(0, 0, 1, 0, vector.Tau);
    }
}

function calculateRadialPolygonPoints(numPoints: number, extentMultiplier: number = 1): pl.Vec2[] {
    const points = new Array<pl.Vec2>();
    const extent = extentMultiplier * (1 + (1 / numPoints)); // Extreme points on polygon need to be bigger so that innermost edges can be at the required radius

    for (let i = 0; i < numPoints; ++i) {
        const angle = vector.Tau * i / numPoints;
        points.push(vector.fromAngle(angle, extent));
    }

    return points;
}

function applyPath(ctx: CanvasRenderingContext2D, points: pl.Vec2[]) {
    if (points.length === 0) {
        return;
    }

    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; ++i) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
}

function applyQuadraticPath(ctx: CanvasRenderingContext2D, bend: number, points: pl.Vec2[]) {
    if (points.length === 0) {
        return;
    }

    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length; ++i) {
        let current = points[i];
        let next = points[(i + 1) % points.length];

        const mid = vector.mid(current, next);
        mid.mul(bend); // negative will become 0-1 and will end up moving towards center

        ctx.quadraticCurveTo(mid.x, mid.y, next.x, next.y);
    }
    ctx.closePath();
}