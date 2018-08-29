export function readFileAsync(file: File): Promise<string> {
    if (file) {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(reader.result as string)
            reader.onerror = (ev) => reject(reader.error)
            reader.readAsText(file);
        });
    } else {
        return Promise.resolve<string>(null);
    }
}