import _ from 'lodash';
import * as pl from 'planck-js';
import * as constants from '../../game/constants';
import * as glx from './glx';
import * as r from './render.model';
import * as vector from '../../game/vector';
import * as w from '../../game/world.model';

import { CanvasCtxStack } from './render.model';
import { Icons } from '../../game/icons';
import { renderIconOnly } from './renderIcon';

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

    console.log("Redrawing texture atlas");

    const state: r.AtlasState = {
        instructions: [],
        coords: new Map(),

        // Start 1x1 so no crashes
        height: 1,
        width: 1,
    };

	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    instructions.forEach(instruction => {
        const coords = renderInstruction(ctxStack, state.height, instruction);
        state.height += coords.height;
        state.width = Math.max(state.width, coords.width);
        state.coords.set(instruction.id, coords);
        state.instructions.push(instruction);
    });

	const image = ctx.getImageData(0, 0, state.width, state.height);
    glx.atlas(ctxStack, image);
    
    provider.atlasState = state;
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

function renderInstruction(ctxStack: CanvasCtxStack, top: number, instruction: r.AtlasInstruction): ClientRect {
	const ctx = ctxStack.atlas;

    ctx.save();

    ctx.translate(0, top);

    ctx.rect(0, 0, instruction.width, instruction.height);
    ctx.clip();

    renderInstructionAtOrigin(ctxStack, instruction);

	ctx.restore();

    return { 
        top,
        bottom: top + instruction.height,
        height: instruction.height,
        left: 0,
        right: instruction.width,
        width: instruction.width,
    };
}

function renderInstructionAtOrigin(ctxStack: CanvasCtxStack, instruction: r.AtlasInstruction) {
    switch (instruction.type) {
        case "text": return renderText(ctxStack, instruction);
        case "icon": return renderIcon(ctxStack, instruction);
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

export function lookupImage(ctxStack: CanvasCtxStack, textureId: string): ClientRect {
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
        right: coords.width / state.width,
        width: coords.width / state.width,
    };
}