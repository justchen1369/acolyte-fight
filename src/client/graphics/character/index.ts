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
    ctx.fill();
    ctx.stroke();

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
    ctx.lineWidth = style.stroke || 0;
    ctx.strokeStyle = style.strokeMask || '#0000';
    ctx.fillStyle = style.fillMask || '#fff';
}

function applyGlyphPath(ctx: CanvasRenderingContext2D, glyph: h.Glyph) {
    const points = [
        pl.Vec2(0, 0),
        pl.Vec2(-glyph.fall, -glyph.extent),
        pl.Vec2(0, -glyph.extent),
        pl.Vec2(glyph.rise, 0),
        pl.Vec2(0, glyph.extent),
        pl.Vec2(-glyph.fall, glyph.extent),
    ];
    applyPath(ctx, points);
}

function applyBodyPath(ctx: CanvasRenderingContext2D, body: h.Body) {
    if (body.numPoints >= 3) {
        applyPath(ctx, calculateRadialPolygonPoints(body.numPoints));
    } else {
        ctx.arc(0, 0, 1, 0, vector.Tau);
    }
}

function calculateRadialPolygonPoints(numPoints: number): pl.Vec2[] {
    const points = new Array<pl.Vec2>();
    const extent = 1 + (1 / numPoints); // Extreme points on polygon need to be bigger so that innermost edges can be at the required radius

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