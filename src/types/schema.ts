import type { StringProperties, StringAttribute } from "./attributes/string";
import type { NumberProperties, NumberAttribute, AnyNumberType } from "./attributes/number";
import type { BinaryProperties, BinaryAttribute } from "./attributes/binary";
import type { BooleanProperties } from "./attributes/boolean";
import type { SetProperties } from "./attributes/set";
import type { NullConstructor, NullProperties } from "./attributes/null";
import { ConstructorTypes } from "./attributes/attribute";
import { ISchemaObject } from "./attributes/object";
import { ISchemaArray } from "./attributes/array";
import { BigIntAttribute, BigIntProperties } from "./attributes/bigint";
import { SchemaType } from "./utils";
import { NativeAttributeBinary } from "@aws-sdk/util-dynamodb";
import { DateProperties, DateAttribute } from "./attributes/date";
import { AnyProperties } from "./attributes/any";

export type CustomValidate = (value: any) => Promise<string | undefined | null | void> | string | undefined | null | void;

export interface AnySchema {
  type: string;
  default?: any;
  fields?: Record<string, AnySchema>;
  items?: AnySchema;
  required?: boolean;
  enum?: (AnyNumberType | string)[];
  min?: AnyNumberType;
  max?: AnyNumberType;
  minLength?: AnyNumberType;
  maxLength?: AnyNumberType;
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  capitalize?: boolean;
  format?: "timestamp" | "EPOCH";
  set?: (...args: any[]) => Promise<any> | any;
  get?: (...args: any[]) => Promise<any> | any;
  validate?: CustomValidate;
}
export type selectAlias = { [key: string]: string | boolean | selectAlias };

export type Mutable<T> = {
  -readonly [K in keyof T]: T[K] extends Set<any> | NativeAttributeBinary | any[] ? T[K] : T[K] extends Record<string, any> ? Mutable<T[K]> : T[K];
};
//  NullProperties<T>
export type GetFieldType<T> = T extends { type: StringConstructor }
  ? StringProperties
  : T extends { type: NumberConstructor }
  ? keyof T extends keyof NumberProperties
    ? NumberProperties
    : never
  : T extends { type: BigIntConstructor }
  ? keyof T extends keyof BigIntProperties
    ? BigIntProperties
    : never
  : T extends { type: BufferConstructor }
  ? keyof T extends keyof BinaryProperties
    ? BinaryProperties
    : never
  : T extends { type: SetConstructor }
  ? keyof T extends keyof SetProperties<T>
    ? SetProperties<T>
    : never
  : T extends { type: BooleanConstructor }
  ? keyof T extends keyof BooleanProperties
    ? BooleanProperties
    : never
  : T extends { type: NullConstructor }
  ? keyof T extends keyof NullProperties
    ? NullProperties
    : never
  : T extends { type: DateConstructor }
  ? keyof T extends keyof DateProperties
    ? DateProperties
    : never
  : T extends { type: ArrayConstructor; items }
  ? keyof T extends keyof ISchemaArray<T>
    ? ISchemaArray<T>
    : never
  : T extends { type: ObjectConstructor; fields: Record<string, any> }
  ? keyof T extends keyof ISchemaObject<T>
    ? ISchemaObject<T>
    : never
  : T extends readonly [any, ...any[]]
  ? {
      [I in keyof T]: GetFieldType<T[I]> extends never ? T[I] : GetFieldType<T[I]>;
    }
  : T extends { readonly type: readonly [any, ...any[]] }
  ? AnyProperties<T["type"]>
  : T extends ConstructorTypes
  ? T
  : never;

// This type provides suggestions based on declared Schema and checks provided Schema validity.
export type SchemaConstructor<T> = {
  [K in keyof T]: T[K] extends { type: StringConstructor }
    ? keyof T[K] extends keyof StringAttribute<T, K>
      ? StringAttribute<T, K>
      : never
    : T[K] extends { type: NumberConstructor }
    ? keyof T[K] extends keyof NumberAttribute<T, K>
      ? NumberAttribute<T, K>
      : never
    : T[K] extends { type: BigIntConstructor }
    ? keyof T[K] extends keyof BigIntAttribute<T, K>
      ? BigIntAttribute<T, K>
      : never
    : T[K] extends { type: BufferConstructor }
    ? keyof T[K] extends keyof BinaryAttribute<T, K>
      ? BinaryAttribute<T, K>
      : never
    : T[K] extends { type: DateConstructor }
    ? keyof T[K] extends keyof DateAttribute<T, K>
      ? DateAttribute<T, K>
      : never
    : T[K] extends { type: SetConstructor }
    ? keyof T[K] extends keyof SetProperties<T[K]>
      ? SetProperties<T[K]>
      : never
    : T[K] extends { type: BooleanConstructor }
    ? keyof T[K] extends keyof BooleanProperties
      ? BooleanProperties
      : never
    : T[K] extends { type: NullConstructor }
    ? keyof T[K] extends keyof NullProperties
      ? NullProperties
      : never
    : T[K] extends { type: ArrayConstructor; items }
    ? keyof T[K] extends keyof ISchemaArray<T[K]>
      ? ISchemaArray<T[K]>
      : never
    : T[K] extends { type: ObjectConstructor; fields: Record<string, any> }
    ? keyof T[K] extends keyof ISchemaObject<T[K]>
      ? ISchemaObject<T[K]>
      : never
    : T[K] extends { type: readonly [any, ...any[]] }
    ? AnyProperties<T[K]["type"]>
    : T[K] extends readonly [any, ...any[]]
    ? {
        [I in keyof T[K]]: GetFieldType<T[K][I]> extends never ? T[K][I] : GetFieldType<T[K][I]>;
      }
    : T[K] extends ConstructorTypes
    ? T[K]
    : never;
};

export type ExtractOptionnalKeys<T> = {
  -readonly [K in keyof T]: T[K] extends ConstructorTypes | { required: true } | { primaryIndex: true } | { sortKey: true } ? never : K;
}[keyof T];

export type ExtractRequiredPutKeys<T> = {
  -readonly [K in keyof T]: T[K] extends {
    default: Function | string | AnyNumberType | boolean | Set<string | AnyNumberType | NativeAttributeBinary> | NativeAttributeBinary | null | any[] | Record<string, any>;
  }
    ? never
    : T[K] extends ConstructorTypes | { required: true } | { primaryIndex: true } | { sortKey: true }
    ? K
    : never;
}[keyof T];

export type PutItem<T> = Pick<CreateItem<T>, ExtractRequiredPutKeys<T>> & Partial<Omit<CreateItem<T>, ExtractRequiredPutKeys<T>>>;

type ExtractNativeObjectTypeWithUnknown<T extends { fields: Record<string, any> }> =
  | Record<Exclude<string, keyof T["fields"]>, any>
  | {
      -readonly [K in keyof T["fields"]]: T["fields"][K] extends readonly [...SchemaType[]] ? ExtractNativeType<T["fields"][K][number]> : ExtractNativeType<T["fields"][K]>;
    } extends infer Childs
  ? ExtractRequiredPutKeys<T["fields"]> extends infer RequiredKeys extends keyof Childs
    ? ExtractOptionnalKeys<T["fields"]> extends infer OptionnalKeys extends keyof Childs
      ? Required<Pick<Childs, RequiredKeys>> & Partial<Pick<Childs, OptionnalKeys>>
      : never
    : never
  : never;

export type ExtractNativeObjectType<T extends { fields: Record<string, any> }> = T extends { allowUndeclared: true }
  ? ExtractNativeObjectTypeWithUnknown<T>
  : {
      -readonly [K in keyof T["fields"]]: T["fields"][K] extends readonly [...SchemaType[]] ? ExtractNativeType<T["fields"][K][number]> : ExtractNativeType<T["fields"][K]>;
    } extends infer Childs
  ? ExtractRequiredPutKeys<T["fields"]> extends infer RequiredKeys extends keyof Childs
    ? ExtractOptionnalKeys<T["fields"]> extends infer OptionnalKeys extends keyof Childs
      ? Required<Pick<Childs, RequiredKeys>> & Partial<Pick<Childs, OptionnalKeys>>
      : never
    : never
  : never;

export type ExtractNativeType<S> = S extends { type: StringConstructor }
  ? S extends { enum: infer E }
    ? E extends readonly string[]
      ? E[number]
      : string
    : string
  : S extends { type: NumberConstructor }
  ? S extends { enum: infer E }
    ? E extends readonly number[]
      ? E[number]
      : number
    : number
  : S extends { type: BigIntConstructor }
  ? S extends { enum: infer E }
    ? E extends readonly bigint[]
      ? E[number]
      : bigint
    : bigint
  : S extends { type: BooleanConstructor }
  ? boolean
  : S extends { type: DateConstructor }
  ? Date | number | string
  : S extends { type: NullConstructor }
  ? null
  : S extends { type: BufferConstructor }
  ? NativeAttributeBinary
  : S extends { type: SetConstructor; items }
  ? Set<ExtractNativeType<S["items"]>>
  : S extends { type: ArrayConstructor; items }
  ? ExtractNativeType<S["items"] extends readonly [...any[]] ? S["items"][number] : S["items"]>[]
  : S extends { type: ObjectConstructor; fields }
  ? ExtractNativeObjectType<S>
  : S extends { type: readonly [...any[]] }
  ? ExtractNativeType<S["type"][number]>
  : S extends StringConstructor
  ? string
  : S extends NumberConstructor
  ? number
  : S extends BigIntConstructor
  ? bigint
  : S extends BooleanConstructor
  ? boolean
  : S extends DateConstructor
  ? Date | number | string
  : S extends BufferConstructor
  ? NativeAttributeBinary
  : S extends ArrayConstructor
  ? S
  : S extends NullConstructor
  ? null
  : never;

export type CreateItem<S> = S extends Record<string, any>
  ? {
      -readonly [K in keyof S]: S[K] extends readonly [...SchemaType[]] ? ExtractNativeType<S[K][number]> : ExtractNativeType<S[K]>;
    }
  : never;
