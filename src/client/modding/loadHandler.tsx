import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as e from './editor.model';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as convert from './convert';
import * as editing from './editing';
import * as fileUtils from '../core/fileUtils';
import * as pages from '../core/pages';
import * as parties from '../core/parties';
import * as rooms from '../core/rooms';
import * as StoreProvider from '../storeProvider';

export async function loadModFile(file: File): Promise<ModTree> {
    const json = await fileUtils.readFileAsync(file);
    const mod = JSON.parse(json) as ModTree;
    if (!(mod && typeof mod === "object")) {
        throw "Invalid mod";
    }
    if (!(mod.Mod && mod.Mod.name)) {
        mod.Mod = mod.Mod || {};
        mod.Mod.name = file.name;
    }
    return mod;
}

export async function loadModIntoEditor(mod: ModTree) {
    const codeTree = convert.modToCode(mod);
    StoreProvider.dispatch({ type: "updateCodeTree", codeTree });
}

export async function loadModIntoGame(mod: ModTree) {
    let roomId: string = null;
    if (mod) {
        roomId = await rooms.createRoomAsync(mod);
    } else {
        roomId = rooms.DefaultRoom;
    }

    await rooms.joinRoomAsync(roomId);
    await parties.movePartyAsync(roomId);
}