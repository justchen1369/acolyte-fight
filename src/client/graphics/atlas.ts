import _ from 'lodash';
import * as pl from 'planck-js';
import * as character from './character';
import * as constants from '../../game/constants';
import * as r from './render.model';
import * as textures from './textures';
import * as vector from '../../game/vector';
import * as w from '../../game/world.model';

import { CanvasCtxStack } from './render.model';
import { Icons } from '../../game/icons';
import { renderIconOnly } from './renderIcon';

const Margin = 1;

interface AtlasStateProvider {
    atlasState: r.AtlasState;
}

export function renderAtlas(ctxStack: CanvasCtxStack, instructions: r.AtlasInstruction[]) {
    const ctx = ctxStack.atlas;
    const provider = getStateProvider(ctxStack);

	const previousState = provider.atlasState;
	if (previousState && alreadyDrawn(previousState, instructions)) {
        return;
    }

    const start = Date.now();

    const state: r.AtlasState = {
        instructions: [],
        coords: new Map(),

        // Start 1x1 so no crashes
        height: 1,
        width: 1,
    };

	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    let leftCursor = 0;
    let topCursor = 0;
    instructions.forEach(instruction => {
        let newRight = leftCursor + Margin + instruction.width + Margin;
        if (newRight >= ctx.canvas.width) {
            // Start a new row
            leftCursor = 0;
            topCursor = state.height + Margin;
        }

        const coords = renderInstruction(ctxStack, leftCursor + Margin, topCursor + Margin, instruction);

        leftCursor = Math.max(leftCursor, coords.right + Margin);

        state.height = Math.max(state.height, coords.bottom + Margin);
        state.width = Math.max(state.width, coords.right + Margin);

        state.coords.set(instruction.id, coords);
        state.instructions.push(instruction);
    });

	const image = ctx.getImageData(0, 0, state.width, state.height);
    textures.uploadTexture(ctxStack, image);
    
    provider.atlasState = state;

    const elapsed = Date.now() - start;
    console.log(`Texture atlas redrawn in ${elapsed} ms`);
}

function getStateProvider(ctxStack: CanvasCtxStack): AtlasStateProvider {
    return ctxStack.atlas.canvas as any as AtlasStateProvider;
}

function alreadyDrawn(state: r.AtlasState, instructions: r.AtlasInstruction[]): boolean {
    if (state.instructions.length !== instructions.length) {
        return false;
    }

    for (let i = 0; i < instructions.length; ++i) {
        if (!_.isEqual(state.instructions[i], instructions[i])) {
            return false;
        }
    }

    return true;
}

function renderInstruction(ctxStack: CanvasCtxStack, left: number, top: number, instruction: r.AtlasInstruction): ClientRect {
	const ctx = ctxStack.atlas;

    ctx.save();

    ctx.translate(left, top);

    ctx.rect(0, 0, instruction.width, instruction.height);
    ctx.clip();

    renderInstructionAtOrigin(ctxStack, instruction);

	ctx.restore();

    return { 
        top,
        bottom: top + instruction.height,
        height: instruction.height,
        left,
        right: left + instruction.width,
        width: instruction.width,
    };
}

function renderInstructionAtOrigin(ctxStack: CanvasCtxStack, instruction: r.AtlasInstruction) {
    switch (instruction.type) {
        case "text": return renderText(ctxStack, instruction);
        case "icon": return renderIcon(ctxStack, instruction);
        case "hero": return renderHero(ctxStack, instruction);
        default: throw `Unknown atlas instruction`;
    }
}

function renderText(ctxStack: CanvasCtxStack, instruction: r.AtlasTextInstruction) {
	const ctx = ctxStack.atlas;

	ctx.font = instruction.font;
	ctx.fillStyle = instruction.color;
	ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(instruction.text, instruction.width / 2, instruction.height / 2, instruction.width);
    
    return instruction;
}

function renderIcon(ctxStack: CanvasCtxStack, instruction: r.AtlasIconInstruction) {
	const ctx = ctxStack.atlas;
    const size = Math.min(instruction.width, instruction.height);
    const icon = Icons[instruction.icon];

    if (icon) {
        renderIconOnly(ctx, new Path2D(icon.path), 1, size, instruction.color);
    }

    return instruction;
}

function renderHero(ctxStack: CanvasCtxStack, instruction: r.AtlasHeroInstruction) {
	const ctx = ctxStack.atlas;

    const center = pl.Vec2(instruction.width / 2, instruction.height / 2);

    if (instruction.body) {
        character.renderBody(ctx, center, instruction.radius, instruction.skin);
    }
    if (instruction.glyph) {
        character.renderGlyph(ctx, center, instruction.radius, instruction.skin);
    }

    return instruction;
}

export function lookup(ctxStack: CanvasCtxStack, textureId: string): ClientRect {
    const provider = getStateProvider(ctxStack);
    const state = provider.atlasState;
    if (!state) {
        return undefined;
    }

    const coords = state.coords.get(textureId);
    if (!coords) {
        return undefined;
    }

    return {
        top: coords.top / state.height,
        bottom: coords.bottom / state.height,
        height: coords.height / state.height,
        left: coords.left / state.width,
        right: coords.right / state.width,
        width: coords.width / state.width,
    };
}