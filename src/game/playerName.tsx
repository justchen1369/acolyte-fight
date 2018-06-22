export const MaxPlayerNameLength = 30;

export function sanitizeName(input: string) {
    let name = input || "";
    name = name.replace(/\W/g, '');
    if (name.length > MaxPlayerNameLength) {
        name = name.substring(0, MaxPlayerNameLength);
    }
    return name;
}
