import type { Descriptor } from "./descriptors";

type TextDescriptor = Extract<Descriptor, { kind: "text" }>;
type NumberDescriptor = Extract<Descriptor, { kind: "number" }>;
type ArrayDescriptor = Extract<Descriptor, { kind: "array" }>;
type ObjectDescriptor = Extract<Descriptor, { kind: "object" }>;

export function isText(value: unknown, descriptor: TextDescriptor): boolean {
  return typeof value === "string" && value.trim() !== "" && (descriptor.prefix === undefined || value.startsWith(descriptor.prefix));
}

export function isNumber(value: unknown, descriptor: NumberDescriptor): boolean {
  return typeof value === "number" && (descriptor.minimum === undefined || value >= descriptor.minimum) && (descriptor.maximum === undefined || value <= descriptor.maximum);
}

export function isArray(value: unknown, descriptor: ArrayDescriptor, matches: (item: unknown, itemDescriptor: Descriptor) => boolean): boolean {
  return Array.isArray(value) && (descriptor.minimum === undefined || value.length >= descriptor.minimum) && (descriptor.length === undefined || value.length === descriptor.length) && value.every((item) => matches(item, descriptor.item));
}

export function isObject(value: unknown, descriptor: ObjectDescriptor, matches: (item: unknown, itemDescriptor: Descriptor) => boolean): boolean {
  if (typeof value !== "object" || value === null) return false;
  const values = new Map(Object.entries(value));
  return Object.entries(descriptor.fields).every(([name, item]) => matches(values.get(name), item));
}
