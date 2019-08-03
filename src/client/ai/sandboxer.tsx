interface Exports {
    [key: string]: any;
}

const exclude = [
    "self",
    "fetch", // Why doesn't this get excluded naturally, I don't know
];
const include = new Set<string>([
    "console",
    "Math",
    "Infinity",
    "NaN",
    "undefined",
    "null",
    "eval",
    "uneval",
    "isFinite",
    "isNaN",
    "parseFloat",
    "parseInt",
    "decodeURI",
    "decodeURIComponent",
    "encodeURI",
    "encodeURIComponent",
    "Object",
    "Function",
    "Boolean",
    "Symbol",
    "Error",
    "EvalError",
    "InternalError ",
    "RangeError",
    "ReferenceError",
    "SyntaxError",
    "TypeError",
    "URIError",
    "Number",
    "BigInt",
    "Math",
    "Date",
    "String",
    "RegExp",
    "Array",
    "Int8Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Int16Array",
    "Uint16Array",
    "Int32Array",
    "Uint32Array",
    "Float32Array",
    "Float64Array",
    "BigInt64Array",
    "BigUint64Array",
    "Map",
    "Set",
    "WeakMap",
    "WeakSet",
    "ArrayBuffer",
    "DataView",
    "JSON",
    "Promise",
    "Generator",
    "GeneratorFunction",
    "Reflect",
    "Proxy",
]);
const preamble = generatePreamble();

export function sandbox(code: string) {
    const all = preamble + code;
    const module = new Function(all);
    const result = module.call(null); // Ensure *this* doesn't allow access to globals

    if (result instanceof Object) {
        const exported = result as Exports;
        for (const key in exported) {
            if (typeof exported[key] === 'function') {
                // Ensure *this* doesn't allow access to globals
                exported[key] = exported[key].bind(null);
            }
        }
    }

    return result;
}

export function generatePreamble() {
    const globals = [...exclude, ...Object.getOwnPropertyNames(self)];
    let preamble = '';
    for (const name of globals) {
        if (!include.has(name)) {
            preamble += `var ${name} = undefined;\n`;
        }
    }
    return preamble;
}