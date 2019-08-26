export function rotate(array: any[], startIndex: number) {
    const result = new Array<any>();
    for (let i = 0; i < array.length; ++i) {
        const index = (startIndex + i) % array.length;
        result.push(array[index]);
    }
    return result;
}

export function random<T>(array: T[]) {
    if (array.length > 0) {
        return array[Math.floor(Math.random() * array.length)];
    } else {
        return undefined;
    }
}