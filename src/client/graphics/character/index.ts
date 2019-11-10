import _ from 'lodash';
import * as pl from 'planck-js';
import * as h from './character.model';
import * as vector from '../../../game/vector';

export function renderBody(ctx: CanvasRenderingContext2D, pos: pl.Vec2, radius: number, skin: h.Skin) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(radius, radius);

    ctx.fillStyle = '#fff';

    body(ctx, skin);
    ctx.fill();

    ctx.restore();
}

export function renderGlyph(ctx: CanvasRenderingContext2D, pos: pl.Vec2, radius: number, skin: h.Skin) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(radius, radius);

    ctx.fillStyle = '#fff';

    // Clip to body
    body(ctx, skin);
    ctx.clip();

    // Glyph
    path(ctx, skin.glyph);
    ctx.fill();
    
    ctx.restore();
}

function body(ctx: CanvasRenderingContext2D, skin: h.Skin) {
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, vector.Tau);
}

function path(ctx: CanvasRenderingContext2D, points: pl.Vec2[]) {
    ctx.beginPath();
    if (points.length === 0) {
        return;
    }

    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; ++i) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
}