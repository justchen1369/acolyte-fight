import _ from 'lodash';

export function spellName(spell: Spell) {
    return spell.name || capitalize(spell.id);
}

function capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function resolveSpellForKey(key: string, keyBindings: KeyBindings, settings: AcolyteFightSettings): Spell {
    const options = _.flatten(settings.Choices.Options[key]);

    let chosenId = keyBindings[key];
    if (!(options.indexOf(chosenId) >= 0)) {
        chosenId = options[0];
    }
    const chosen = settings.Spells[chosenId];
    return chosen;
}