import * as Reselect from 'reselect';
import * as e from './editor.model';
import * as convert from './convert';
import * as settings from '../../game/settings';

export const defaultTree = convert.settingsToCode(settings.DefaultSettings);

export const codeToSettings = Reselect.createSelector(
    (codeTree: e.CodeTree) => codeTree,
    (codeTree: e.CodeTree) => modToSettings(codeToMod(codeTree).mod));

function modToSettings(mod: ModTree) {
    return mod ? settings.calculateMod(mod) : null;
}

export const codeToMod = Reselect.createSelector(
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
