import type { StringProperties } from "./string";
import type { AnyNumberType, NumberProperties, NumericConditions } from "./number";
import type { BinaryProperties } from "./binary";
import { AttributeTypeConditions } from "./attribute";
import { CustomValidate, ExtractNativeType, GetFieldType } from "../schema";
import { BigIntProperties } from "./bigint";
import { NativeAttributeBinary } from "@aws-sdk/util-dynamodb";
import { DateProperties } from "./date";
import { CAN_NOT_USE_MULTIPLE_OPERATIONS } from "../utils";

type SetItemType<T> = T extends { items }
  ? T["items"] extends StringConstructor | NumberConstructor | BigIntConstructor | BufferConstructor | DateConstructor
    ? T["items"]
    : T["items"] extends StringProperties | NumberProperties | BigIntProperties | BinaryProperties | DateProperties
    ? Omit<GetFieldType<T["items"]>, "default" | "required">
    : never
  : never;

export type SetProperties<T> = {
  type: SetConstructor;
  items: SetItemType<T>;
  default?: Set<ExtractNativeType<SetItemType<T>>> extends infer SetItem ? SetItem | (() => Promise<SetItem> | SetItem) : never;
  required?: boolean;
  set?: (self?: Set<ExtractNativeType<SetItemType<T>>>, item?: Record<string, any>, setterInfo?: any) => Promise<any> | any;
  get?: (self?: Set<ExtractNativeType<SetItemType<T>>>, item?: Record<string, any>, getterInfo?: any) => Promise<any> | any;
  validate?: CustomValidate;
  description?: any;
};

type SetConditionsExpr<T extends string | number | bigint | NativeAttributeBinary | Date> = {
  $size?: NumericConditions;
  $not?: SetConditionsExpr<T>;
  $and?: SetConditionsExpr<T>[];
  $or?: SetConditionsExpr<T>[];
  $exists?: boolean;
  $includes?: T;
  $eq?: any;
  $neq?: any;
  $type?: AttributeTypeConditions;
  $in?: [any, ...any[]];
};

export type SetConditions<T extends string | number | bigint | NativeAttributeBinary | Date> = SetConditionsExpr<T> | SetInstance<T>;

interface UpdateSetExpressionAdd<T> {
  $add: T | T[];
  $delete?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $set?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $ifNotExists?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
}

interface UpdateSetExpressionDelete<T> {
  $delete: T | T[];
  $add?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $set?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $ifNotExists?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
}

interface UpdateSetExpressionSet<T extends string | number | bigint | NativeAttributeBinary | Date> {
  $set: SetInstance<T>;
  $delete?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $add?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $ifNotExists?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
}

interface UpdateSetExpressionIfNotExists<T extends string | number | bigint | NativeAttributeBinary | Date> {
  $ifNotExists: SetInstance<T>;
  $add?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $delete?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $set?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
}

// this provides valid type checking when using 'new Set()' and {$set; $add} etc.

type SetKnownKeys = "add" | "clear" | "delete" | "entries" | "values" | "forEach" | "has" | "keys" | "size";
type SetInstance<T extends string | number | bigint | NativeAttributeBinary | Date> = Omit<Set<T>, SetKnownKeys>;

export type UpdateSetExpression<T extends string | number | bigint | NativeAttributeBinary | Date> =
  | SetInstance<T>
  | ((UpdateSetExpressionIfNotExists<T> | UpdateSetExpressionAdd<T> | UpdateSetExpressionDelete<T> | UpdateSetExpressionSet<T>) & Omit<Set<any>, keyof Set<any>>);
