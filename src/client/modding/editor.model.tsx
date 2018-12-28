export interface CodeTree {
    spells: CodeSection;
    maps: CodeSection;
    icons: CodeSection;
    sounds: CodeSection;
    constants: CodeConstants;

    [key: string]: CodeSection;
}

export interface CodeSection {
    [key: string]: string;
}

export interface CodeConstants extends CodeSection {
    world: string;
    obstacle: string;
    hero: string;
    choices: string;
}

export type ErrorTree = {
    [K in keyof CodeTree]?: ErrorSection;
}

export interface ErrorSection {
    [key: string]: string;
}

export class ParseException {
    errors: ErrorTree;

    constructor(errors: ErrorTree) {
        this.errors = errors;
    }
}