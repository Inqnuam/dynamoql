import { NativeAttributeBinary } from "@aws-sdk/util-dynamodb";
import { GetFieldType } from "../schema";
import { Null, NullConstructor } from "./null";

export var Any: [AnyDbType, ...AnyDbType[]] = [
  { type: String },
  { type: Number },
  { type: BigInt },
  { type: Boolean },
  Null,
  { type: Buffer },
  { type: Object, allowUndeclared: true, fields: {} },
  { type: Array, items: Any },
  { type: Set, items: String },
  { type: Set, items: Number },
  { type: Set, items: BigInt },
  { type: Set, items: Buffer },
];

type AnyDbType =
  | { type: StringConstructor }
  | { type: NumberConstructor }
  | { type: BigIntConstructor }
  | { type: BooleanConstructor }
  | NullConstructor
  | { type: BufferConstructor }
  | { type: ObjectConstructor; allowUndeclared: true; fields: {} }
  | { type: ArrayConstructor; items: [AnyDbType, ...AnyDbType[]] }
  | { type: SetConstructor; items: StringConstructor }
  | { type: SetConstructor; items: NumberConstructor }
  | { type: SetConstructor; items: BigIntConstructor }
  | { type: SetConstructor; items: BufferConstructor };

type AnyNativeDbType =
  | string
  | number
  | bigint
  | null
  | boolean
  | NativeAttributeBinary
  | Set<string>
  | Set<number>
  | Set<bigint>
  | Set<NativeAttributeBinary>
  | Record<string, any>
  | any[];

export type AnyProperties<T extends readonly [any, ...any[]]> = {
  type: {
    [I in keyof T]: GetFieldType<T[I]> extends never ? T[I] : GetFieldType<T[I]>;
  };
  required?: boolean;
  default?: AnyNativeDbType | ((item?: Record<string, any>) => Promise<AnyNativeDbType> | AnyNativeDbType);
  set?: never;
  get?: never;
  description?: any;
};
