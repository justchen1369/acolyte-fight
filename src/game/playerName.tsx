export const MaxPlayerNameLength = 30;

export function sanitizeName(input: string) {
    let name = input || "";
    name = name.replace(/[^A-Za-z0-9_-]/g, '');
    if (name.length > MaxPlayerNameLength) {
        name = name.substring(0, MaxPlayerNameLength);
    }
    return name;
}
