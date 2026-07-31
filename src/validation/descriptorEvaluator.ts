import type { Descriptor } from "./descriptors";
import { isArray, isNumber, isObject, isText } from "./descriptorChecks";

export function matches(value: unknown, descriptor: Descriptor): boolean {
  return evaluators[descriptor.kind](value, descriptor);
}

type Evaluator = (value: unknown, descriptor: Descriptor) => boolean;
const evaluators: Record<Descriptor["kind"], Evaluator> = {
  any: () => true,
  text: (value, descriptor) => isText(value, descriptor as Extract<Descriptor, { kind: "text" }>),
  string: (value) => typeof value === "string",
  number: (value, descriptor) => isNumber(value, descriptor as Extract<Descriptor, { kind: "number" }>),
  literal: (value, descriptor) => (descriptor as Extract<Descriptor, { kind: "literal" }>).values.includes(value),
  array: (value, descriptor) => isArray(value, descriptor as Extract<Descriptor, { kind: "array" }>, matches),
  object: (value, descriptor) => isObject(value, descriptor as Extract<Descriptor, { kind: "object" }>, matches),
  optional: (value, descriptor) => value === undefined || matches(value, (descriptor as Extract<Descriptor, { kind: "optional" }>).item),
  all: (value, descriptor) => (descriptor as Extract<Descriptor, { kind: "all" }>).items.every((item) => matches(value, item)),
};
