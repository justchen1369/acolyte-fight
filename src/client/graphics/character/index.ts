import _ from 'lodash';
import * as pl from 'planck-js';
import * as h from './character.model';
import * as vector from '../../../game/vector';

export function renderBody(ctx: CanvasRenderingContext2D, pos: pl.Vec2, radius: number, skin: h.Skin) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(radius, radius);

    ctx.fillStyle = '#fff';

    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, vector.Tau);
    ctx.fill();

    ctx.restore();
}

export function renderGlyph(ctx: CanvasRenderingContext2D, pos: pl.Vec2, radius: number, skin: h.Skin) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(radius, radius);

    ctx.fillStyle = '#fff';

    // Clip to body
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, vector.Tau);
    ctx.clip();

    // Glyph
    ctx.beginPath();
    renderPath(ctx, skin.glyph);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

function renderPath(ctx: CanvasRenderingContext2D, points: pl.Vec2[]) {
    if (points.length === 0) {
        return;
    }

    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; ++i) {
        ctx.lineTo(points[i].x, points[i].y);
    }
}