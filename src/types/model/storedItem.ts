import type { ConstructorTypes } from "../attributes/attribute";
import type { NullConstructor } from "../attributes/null";
import type { SchemaType } from "../utils";

export type ExtractStoredRequiredKeys<T> = {
  -readonly [K in keyof T]: T[K] extends ConstructorTypes | { required: true } | { primaryIndex: true } | { sortKey: true } | { default } ? K : never;
}[keyof T];

export type ExtractStoredOptionnalKeys<T> = {
  -readonly [K in keyof T]: T[K] extends ConstructorTypes | { required: true } | { primaryIndex: true } | { sortKey: true } | { default } ? never : K;
}[keyof T];

type GetStoredArrayType<T extends { items }> = GetStoredItemFieldType<T["items"]>[];
type GetStoredObjectType<T extends { fields }> = StoredItem<T["fields"]>;

type GetStoredItemFieldType<T> = T extends StringConstructor
  ? string
  : T extends NumberConstructor
  ? number
  : T extends BigIntConstructor
  ? bigint
  : T extends BooleanConstructor
  ? boolean
  : T extends NullConstructor
  ? null
  : T extends BufferConstructor
  ? Buffer
  : T extends DateConstructor
  ? Date
  : T extends ObjectConstructor
  ? Record<string, any>
  : T extends readonly [...SchemaType[]]
  ? GetStoredItemFieldType<T[number]>
  : T extends { type }
  ? T extends { enum: readonly [...any[]] }
    ? GetStoredItemFieldType<T["enum"][number]>
    : T extends { type: ArrayConstructor; items }
    ? GetStoredArrayType<T>
    : T extends { type: SetConstructor; items }
    ? Set<GetStoredItemFieldType<T["items"]>>
    : T extends { type: ObjectConstructor; fields; allowUndeclared: true }
    ? GetStoredObjectType<T> & Record<string, any>
    : T extends { type: ObjectConstructor; fields }
    ? GetStoredObjectType<T>
    : GetStoredItemFieldType<T["type"]>
  : // enum
  T extends string | number | bigint | boolean
  ? T
  : never;

export type StoredItem<S> = {
  [K in ExtractStoredRequiredKeys<S>]: GetStoredItemFieldType<S[K]>;
} & {
  [K in ExtractStoredOptionnalKeys<S>]?: GetStoredItemFieldType<S[K]>;
};
