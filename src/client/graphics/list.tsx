export class Float32List {
    private array = new Float32Array(128);
    private length = 0;

    get size() {
        return this.length;
    }

    asArray() {
        return this.array;
    }

    push(value: number) {
        const newSize = this.length + 1;
        if (this.array.length < newSize) {
            // Double size of array
            const resize = new Float32Array(this.array.length * 2);
            resize.set(this.array);
            this.array = resize;
        }

        this.array[this.length] = value;
        ++this.length;
    }

    clear() {
        this.length = 0;
    }
}