import _ from 'lodash';
import * as modder from '../../game/modder';
import * as settings from '../../game/settings';
import * as e from './editor.model';

export function modToCode(mod: ModTree): e.CodeTree {
    return settingsToCode(modder.modToSettings(mod));
}

export function settingsToCode(settings: AcolyteFightSettings): e.CodeTree {
    const tree: e.CodeTree = {
        spells: spellsToCode(settings.Spells),
        maps: mapsToCode(settings.Layouts),
        obstacles: obstacleTemplatesToCode(settings.ObstacleTemplates),
        icons: iconsToCode(settings.Icons),
        sounds: soundsToCode(settings.Sounds),
        constants: constantsToCode(settings),
    };
    return tree;
}

function spellsToCode(spells: Spells): e.CodeSection {
    const lookup: e.CodeSection = {};
    for (const id of Object.keys(spells)) {
        const spell = spells[id];
        lookup[spell.id] = stringify(spell);
    }
    return lookup;
}

function mapsToCode(layouts: Layouts): e.CodeSection {
    const lookup: e.CodeSection = {};
    for (const id of Object.keys(layouts)) {
        const layout = layouts[id];
        lookup[id] = stringify({
            id: id,
            ...layout,
        });
    }
    return lookup;
}

function obstacleTemplatesToCode(obstacleTemplates: ObstacleTemplateLookup): e.CodeSection {
    const lookup: e.CodeSection = {};
    for (const id of Object.keys(obstacleTemplates)) {
        const template = obstacleTemplates[id];
        lookup[id] = stringify({
            id,
            ...template,
        });
    }
    return lookup;
}

function iconsToCode(icons: IconLookup): e.CodeSection {
    const lookup: e.CodeSection = {};
    for (const id of Object.keys(icons)) {
        const icon = icons[id];
        lookup[id] = stringify({
            id: id,
            ...icon,
        });
    }
    return lookup;
}

function soundsToCode(sounds: Sounds): e.CodeSection {
    const lookup: e.CodeSection = {};
    for (const id of Object.keys(sounds)) {
        const sound = sounds[id];
        lookup[id] = stringify({
            id: id,
            ...sound,
        });
    }
    return lookup;
}

function constantsToCode(settings: AcolyteFightSettings): e.CodeConstants {
    return {
        ai: settings.Code,
        mod: stringify(settings.Mod),
        matchmaking: stringify(settings.Matchmaking),
        world: stringify(settings.World),
        obstacle: stringify(settings.Obstacle),
        hero: stringify(settings.Hero),
        choices: stringify(settings.Choices),
        visuals: stringify(settings.Visuals),
    };
}

export function stringify(data: any): string {
    return JSON.stringify(data, null, "\t");
}

function codeToSettings(codeTree: e.CodeTree): AcolyteFightSettings {
    const errorTree: e.ErrorTree = {};
    const settings: AcolyteFightSettings = {
        Matchmaking: codeToConstants(codeTree, "matchmaking", errorTree),
        Spells: codeToSpells(codeTree, errorTree),
        Sounds: codeToSounds(codeTree, errorTree),
        Icons: codeToIcons(codeTree, errorTree),
        Layouts: codeToLayouts(codeTree, errorTree),
        Mod: codeToConstants(codeTree, "mod", errorTree),
        World: codeToConstants(codeTree, "world", errorTree),
        Obstacle: codeToConstants(codeTree, "obstacle", errorTree),
        ObstacleTemplates: codeToObstacleTemplates(codeTree, errorTree),
        Hero: codeToConstants(codeTree, "hero", errorTree),
        Choices: codeToConstants(codeTree, "choices", errorTree),
        Visuals: codeToConstants(codeTree, "visuals", errorTree),
        Code: codeTree.constants.ai,
    };
    if (Object.keys(errorTree).length > 0) {
        throw new e.ParseException(errorTree);
    }
    return settings;
}

function codeToSpells(codeTree: e.CodeTree, errorTree: e.ErrorTree): Spells {
    const spells: Spells = {};
    const errors: e.ErrorSection = {};
    for (const key of Object.keys(codeTree.spells)) {
        try {
            const code = codeTree.spells[key];
            const json = JSON.parse(code);
            spells[json.id] = json;
        } catch (exception) {
            errors[key] = `${exception}`;
        }
    }
    if (Object.keys(errors).length > 0) {
        errorTree.spells = errors;
    }
    return spells;
}

function codeToSounds(codeTree: e.CodeTree, errorTree: e.ErrorTree): Sounds {
    const sounds: Sounds = {};
    const errors: e.ErrorSection = {};
    for (const key of Object.keys(codeTree.sounds)) {
        try {
            const code = codeTree.sounds[key];
            const json = JSON.parse(code);

            const id = json.id;
            delete json.id;

            sounds[id] = json;
        } catch (exception) {
            errors[key] = `${exception}`;
        }
    }
    if (Object.keys(errors).length > 0) {
        errorTree.sounds = errors;
    }
    return sounds;
}

function codeToIcons(codeTree: e.CodeTree, errorTree: e.ErrorTree): IconLookup {
    const icons: IconLookup = {};
    const errors: e.ErrorSection = {};
    for (const key of Object.keys(codeTree.icons)) {
        try {
            const code = codeTree.icons[key];
            const json = JSON.parse(code);

            const id = json.id;
            delete json.id;

            icons[id] = json;
        } catch (exception) {
            errors[key] = `${exception}`;
        }
    }
    if (Object.keys(errors).length > 0) {
        errorTree.icons = errors;
    }
    return icons;
}

function codeToLayouts(codeTree: e.CodeTree, errorTree: e.ErrorTree): Layouts {
    const layouts: Layouts = {};
    const errors: e.ErrorSection = {};
    for (const key of Object.keys(codeTree.maps)) {
        try {
            const code = codeTree.maps[key];
            const json = JSON.parse(code);

            const id = json.id;
            delete json.id;

            layouts[id] = json;
        } catch (exception) {
            errors[key] = `${exception}`;
        }
    }
    if (Object.keys(errors).length > 0) {
        errorTree.maps = errors;
    }
    return layouts;
}

function codeToObstacleTemplates(codeTree: e.CodeTree, errorTree: e.ErrorTree): ObstacleTemplateLookup {
    const obstacleTemplates: ObstacleTemplateLookup = {};
    const errors: e.ErrorSection = {};
    for (const key of Object.keys(codeTree.obstacles)) {
        try {
            const code = codeTree.obstacles[key];
            const json = JSON.parse(code);

            const id = json.id;
            delete json.id;

            obstacleTemplates[id] = json;
        } catch (exception) {
            errors[key] = `${exception}`;
        }
    }
    if (Object.keys(errors).length > 0) {
        errorTree.obstacles = errors;
    }
    return obstacleTemplates;
}

function codeToConstants(codeTree: e.CodeTree, key: string, errorTree: e.ErrorTree): any {
    try {
        const code = codeTree.constants[key];
        return JSON.parse(code);
    } catch (exception) {
        if (!errorTree.constants) {
            errorTree.constants = {};
        }
        errorTree.constants[key] = `${exception}`;
    }
}

export function codeToMod(codeTree: e.CodeTree): Object {
    const newSettings = codeToSettings(codeTree);
    const mod = modder.diff(settings.DefaultSettings, newSettings);
    return mod || {};
}