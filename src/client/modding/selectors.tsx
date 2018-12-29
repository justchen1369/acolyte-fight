import * as Reselect from 'reselect';
import * as e from './editor.model';
import * as convert from './convert';
import * as settings from '../../game/settings';

export const defaultTree = convert.settingsToCode(settings.DefaultSettings);

export const settingsToCodeTree = Reselect.createSelector(
    (settings: AcolyteFightSettings) => settings,
    (settings) => convert.settingsToCode(settings));

export const applyMod = Reselect.createSelector(
    (mod: ModTree) => mod,
    (mod: ModTree) => {
        return mod ? settings.calculateMod(mod) : null;
    }
);

export const createMod = Reselect.createSelector(
    (codeTree: e.CodeTree) => codeTree,
    (codeTree: e.CodeTree) => {
        const result: ModResult = {
            mod: null,
            errors: {},
        };
        if (!codeTree) {
            return result;
        }

        try {
            result.mod = convert.codeToMod(codeTree);
        } catch (exception) {
            if (exception instanceof e.ParseException) {
                result.errors = exception.errors;
            } else {
                throw exception;
            }
        }
        return result;
    }
);

export interface ModResult {
    mod: ModTree;
    errors: e.ErrorTree;
}
