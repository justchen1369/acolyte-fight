export const MaxPlayerNameLength = 24;

export function sanitizeName(input: string) {
    let name = input || "";
    name = name.replace(/[^A-Za-z0-9_\-\.\+@]/g, '');
    if (name.length > MaxPlayerNameLength) {
        name = name.substring(0, MaxPlayerNameLength);
    }
    return name;
}

export function validName(name: string) {
    return name && name.trim().length > 0 && /[A-Za-z0-9]/.test(name);
}