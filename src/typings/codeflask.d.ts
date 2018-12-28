declare module "codeflask" {
    class CodeFlask {
        constructor(selectorOrElement: string | HTMLElement, opts: CodeFlaskOpts)

        getCode(): string;
        updateCode(code: string): void;
        onUpdate(callback: (code: string) => void): void;
    }

    interface CodeFlaskOpts {
        language: string;
        rtl?: boolean;
        tabSize?: number;
        enableAutocorrect?: boolean;
        lineNumbers?: number;
        defaultTheme?: boolean;
        areaId?: string;
        readonly?: boolean;
    }

    export default CodeFlask;
}
