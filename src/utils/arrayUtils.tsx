export function rotate(array: any[], startIndex: number) {
    const result = new Array<any>();
    for (let i = 0; i < array.length; ++i) {
        const index = (startIndex + i) % array.length;
        result.push(array[index]);
    }
    return result;
}