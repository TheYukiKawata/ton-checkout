export type JsonObject = { readonly [key: string]: unknown };

export function asObject(value: unknown, path: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Expected object at ${path}`);
  }
  return value as JsonObject;
}

export function asArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`Expected array at ${path}`);
  return value;
}

export function asString(value: unknown, path: string): string {
  if (typeof value !== "string") throw new Error(`Expected string at ${path}`);
  return value;
}

export function asNumber(value: unknown, path: string): number {
  if (typeof value !== "number") throw new Error(`Expected number at ${path}`);
  return value;
}

export function asBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new Error(`Expected boolean at ${path}`);
  return value;
}

export function asOptionalString(value: unknown, path: string): string | null {
  return value === undefined || value === null ? null : asString(value, path);
}

export function asInteger(value: unknown, path: string): bigint {
  if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  throw new Error(`Expected integer at ${path}`);
}
