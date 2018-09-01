export function spellName(spell: Spell) {
    return spell.name || capitalize(spell.id);
}

function capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}