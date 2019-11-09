import _ from 'lodash';
import * as pl from 'planck-js';
import * as r from './render.model';
import * as vector from '../../game/vector';
import ColTuple from './colorTuple';

const glyphPoints = [
    pl.Vec2(0, 0),
    pl.Vec2(-1, -1),
    pl.Vec2(0, -1),
    pl.Vec2(0.5, 0),
    pl.Vec2(0, 1),
    pl.Vec2(-1, 1),
];

export function render(ctx: CanvasRenderingContext2D, pos: pl.Vec2, radius: number, config: r.HeroConfig) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(radius, radius);

    // Body
    {
        const angle = (3./8) * vector.Tau;

        const from = vector.fromAngle(angle, radius).neg().add(pos);
        const to = vector.fromAngle(angle, radius).add(pos);

        const fromStyle = ColTuple.parse(config.color);
        const toStyle = ColTuple.parse(config.color).darken(0.5);

        const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
        gradient.addColorStop(0, fromStyle.string());
        gradient.addColorStop(1, toStyle.string());

        ctx.fillStyle = gradient;

        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, vector.Tau);
        ctx.fill();
    }
    ctx.clip();

    // Glyph
    {
        const glyphColor = ColTuple.parse(config.color).mix(ColTuple.parse('#fff'), 0.5);
        ctx.fillStyle = glyphColor.string();

        ctx.beginPath();
        renderPath(ctx, glyphPoints);
        ctx.closePath();
        ctx.fill();
    }
    
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