export function required(value: boolean, type: "boolean"): boolean;
export function required(value: string, type: "string"): boolean;
export function required(value: number, type: "number"): boolean;
export function required(value: object, type: "object"): boolean;
export function required(value: any, type: string): boolean {
	return typeof value === type;
}

export function optional(value: boolean, type: "boolean"): boolean;
export function optional(value: string, type: "string"): boolean;
export function optional(value: number, type: "number"): boolean;
export function optional(value: object, type: "object"): boolean;
export function optional(value: any, type: string): boolean {
	return value === undefined || value === null || (typeof value === type);
}