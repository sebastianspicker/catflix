export type Descriptor =
  | { readonly kind: "any" }
  | { readonly kind: "text"; readonly prefix?: string }
  | { readonly kind: "string" }
  | { readonly kind: "number"; readonly minimum?: number; readonly maximum?: number }
  | { readonly kind: "literal"; readonly values: readonly unknown[] }
  | { readonly kind: "array"; readonly item: Descriptor; readonly minimum?: number; readonly length?: number }
  | { readonly kind: "object"; readonly fields: Readonly<Record<string, Descriptor>> }
  | { readonly kind: "optional"; readonly item: Descriptor }
  | { readonly kind: "all"; readonly items: readonly Descriptor[] };

export const text = (prefix?: string): Descriptor => ({ kind: "text", prefix });
export const string = (): Descriptor => ({ kind: "string" });
export const anything = (): Descriptor => ({ kind: "any" });
export const number = (minimum?: number, maximum?: number): Descriptor => ({ kind: "number", minimum, maximum });
export const oneOf = (...values: readonly unknown[]): Descriptor => ({ kind: "literal", values });
export const arrayOf = (item: Descriptor, minimum?: number, length?: number): Descriptor => ({ kind: "array", item, minimum, length });
export const fields = (fieldMap: Readonly<Record<string, Descriptor>>): Descriptor => ({ kind: "object", fields: fieldMap });
export const optional = (item: Descriptor): Descriptor => ({ kind: "optional", item });
const allOf = (...items: readonly Descriptor[]): Descriptor => ({ kind: "all", items });
export { matches } from "./descriptorEvaluator";
