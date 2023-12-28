import { AttributeTypeConditions } from "./attribute";
import type { AttributeProperties } from "../index";
import type { AnyNumberType, NumericConditions } from "./number";
import { CustomValidate } from "../schema";
import { CAN_NOT_USE_MULTIPLE_OPERATIONS } from "../utils";

export interface BinaryProperties {
  type: BufferConstructor;
  default?: BinaryInstance | ((item?: Record<string, any>) => Promise<BinaryInstance> | BinaryInstance);
  required?: boolean;
  min?: AnyNumberType;
  max?: AnyNumberType;
  set?: (self?: Buffer, item?: Record<string, any>, setterInfo?: any) => Promise<any> | any;
  get?: (self?: Buffer, item?: Record<string, any>, getterInfo?: any) => Promise<any> | any;
  validate?: CustomValidate;
  description?: any;
}

export type BinaryAttribute<T, FieldName extends keyof T> = BinaryProperties & AttributeProperties<T, FieldName>;

export interface BinaryInstance {
  readonly [Symbol.toStringTag]: "Int8Array" | "Uint8Array" | "Uint8ClampedArray" | "Int16Array" | "Uint16Array" | "Int32Array" | "Float32Array" | "Float64Array";
}

type BinaryConditionsExpr = {
  $not?: BinaryConditionsExpr;
  $or?: BinaryConditionsExpr[];
  $and?: BinaryConditionsExpr[];
  $size?: NumericConditions;
  $exists?: boolean;
  $eq?: any;
  $neq?: any;
  $type?: AttributeTypeConditions;
  $startsWith?: BinaryInstance;
  $includes?: BinaryInstance;
  $gt?: BinaryInstance;
  $gte?: BinaryInstance;
  $lte?: BinaryInstance;
  $lt?: BinaryInstance;
  $in?: [any, ...any[]];
  $between?: [BinaryInstance, BinaryInstance];
};
export type BinaryConditions = BinaryConditionsExpr | BinaryInstance;

interface BinaryUpdateExpressionSet {
  $set: BinaryInstance;
  $ifNotExists?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
}

interface BinaryUpdateExpressionIfNotExists {
  $set?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $ifNotExists: BinaryInstance;
}
export type BinaryUpdateExpression = BinaryInstance | BinaryUpdateExpressionSet | BinaryUpdateExpressionIfNotExists;

type ValidBinarySortKeyExpressions =
  | { $gte?: BinaryInstance; $gt?: never; $lte?: never; $lt?: never; $eq?: never; $between?: never; $startsWith?: never }
  | { $gte?: never; $gt?: BinaryInstance; $lte?: never; $lt?: never; $eq?: never; $between?: never; $startsWith?: never }
  | { $gte?: never; $gt?: never; $lte?: BinaryInstance; $lt?: never; $eq?: never; $between?: never; $startsWith?: never }
  | { $gte?: never; $gt?: never; $lte?: never; $lt?: BinaryInstance; $eq?: never; $between?: never; $startsWith?: never }
  | { $gte?: never; $gt?: never; $lte?: never; $lt?: never; $eq?: BinaryInstance; $between?: never; $startsWith?: never }
  | { $gte?: never; $gt?: never; $lte?: never; $lt?: never; $eq?: never; $between?: [BinaryInstance, BinaryInstance]; $startsWith?: never }
  | { $gte?: never; $gt?: never; $lte?: never; $lt?: never; $eq?: never; $between?: never; $startsWith?: BinaryInstance };

export type BinarySortKeyExpression = BinaryInstance | ValidBinarySortKeyExpressions;

const nodeBinaryTypes = [
  "ArrayBuffer",
  "Blob",
  "Buffer",
  "DataView",
  "File",
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
];

export const isBinary = (data: any): boolean => nodeBinaryTypes.includes(data?.constructor?.name);
