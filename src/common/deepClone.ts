import { isBinary } from "../types/attributes/binary";
import { isJsObject } from "../types/attributes/object";

export const cloneObject = (value: Record<string, any>) => {
  const clonedValue = {};

  for (const [k, v] of Object.entries(value)) {
    clonedValue[k] = deepClone(v);
  }

  return clonedValue;
};

export const cloneArray = (value: any[]) => {
  const clonedValue = [];

  for (let i = 0; i < value.length; i++) {
    clonedValue.push(deepClone(value[i]));
  }

  return clonedValue;
};

export const cloneSet = (value: Set<any>) => {
  const clonedValue = new Set();

  const values = Array.from(value.values());

  for (let i = 0; i < values.length; i++) {
    clonedValue.add(deepClone(values[i]));
  }
  return clonedValue;
};

export const cloneBinary = (value: Buffer) => Buffer.from(value);
export const cloneDate = (value: Date) => new Date(value.getTime());

export const deepClone = (value: any) => {
  if (typeof structuredClone == "function") {
    return structuredClone(value);
  }

  if (isJsObject(value)) {
    return cloneObject(value);
  }

  if (Array.isArray(value)) {
    return cloneArray(value);
  }

  if (value instanceof Set) {
    return cloneSet(value);
  }

  if (value instanceof Date) {
    return cloneDate(value);
  }
  if (isBinary(value)) {
    return cloneBinary(value);
  }

  return value;
};
