import { NullConstructor } from "../attributes/null";
import { IndexSignature, NonNeverFields, ScalarTypes, SchemaType } from "../utils";
import type { GetReturnedType } from "./createdItem";
import type { ExtractStoredRequiredKeys, ExtractStoredOptionnalKeys } from "./storedItem";

type GetStoredArrayType<T extends { items }> = GetGotItemFieldType<T["items"]>[];
type GetStoredObjectType<T extends { fields }> = GotItem<T["fields"]>;

type GetGotItemFieldType<T> = T extends StringConstructor
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
  ? GetGotItemFieldType<T[number]>
  : T extends { type }
  ? T extends { enum: readonly [...any[]] }
    ? GetGotItemFieldType<T["enum"][number]>
    : T extends { get }
    ? GetReturnedType<T["get"]>
    : T extends { type: ArrayConstructor; items }
    ? GetStoredArrayType<T>
    : T extends { type: SetConstructor; items }
    ? Set<GetGotItemFieldType<T["items"]>>
    : T extends { type: ObjectConstructor; fields; allowUndeclared: true }
    ? GetStoredObjectType<T> & Record<string, any>
    : T extends { type: ObjectConstructor; fields }
    ? GetStoredObjectType<T>
    : GetGotItemFieldType<T["type"]>
  : // enum
  T extends string | number | bigint | boolean
  ? T
  : never;

export type GotItem<S> = {
  [K in ExtractStoredRequiredKeys<S>]: GetGotItemFieldType<S[K]>;
} & {
  [K in ExtractStoredOptionnalKeys<S>]?: GetGotItemFieldType<S[K]>;
};

type ExtractArrayChildPath<P> = P extends `${IndexSignature}${infer U}` ? (U extends `.${infer C}` ? C : U) : never;

type GetChilds<F extends readonly any[], Parent extends string | number> = readonly {
  [K in F[number]]: Parent extends number
    ? ExtractArrayChildPath<K>
    : K extends `${Parent}${IndexSignature}.${infer U}`
    ? U
    : K extends `${Parent}.${infer U}`
    ? U
    : K extends `${IndexSignature}`
    ? number
    : K extends `${IndexSignature}.${infer U}`
    ? U
    : K extends `.${infer U}`
    ? U
    : never;
}[F[number]][];

type isSelected<FieldName, Selects extends readonly any[]> = FieldName extends GetFilterParentField<Selects[number]> ? true : false;

type SelectFilteredValue<V, Childs extends readonly any[]> = V extends ScalarTypes
  ? V
  : V extends any[]
  ? Childs extends never
    ? V
    : FilterSelect<V[number], Childs>[]
  : Childs extends never[]
  ? V
  : V extends Record<string, any>
  ? FilterSelect<V, Childs>
  : never;

type FullSelect<K, F> = F extends readonly never[] ? K : never;

type FilterObject<I, F extends readonly any[]> = {
  [K in keyof I]: K extends string ? (isSelected<K, F> extends true ? SelectFilteredValue<I[K], GetChilds<F, K>> : FullSelect<I[K], F>) : never;
} extends infer U
  ? NonNeverFields<U> extends never
    ? I extends Record<string, any>
      ? Record<string, any>
      : never
    : Pick<U, NonNeverFields<U>>
  : never;

export type FilterSelect<I, F extends readonly any[]> = I extends any[] ? FilterArrayChilds<I[number], GetChilds<F, number>>[] : FilterObject<I, F>;

type GetFilterParentField<P extends string> = P extends `${infer Key}.`
  ? Key
  : P extends `${infer Key}${IndexSignature}`
  ? Key
  : P extends `${infer Key}${IndexSignature}${string}`
  ? Key
  : P extends `${infer Key}.${string}`
  ? Key
  : P;

type FilterArrayChilds<I, F extends readonly any[] | any[]> = F[number] extends number
  ? I
  : I extends any[]
  ? FilterSelect<I[number], readonly ExtractArrayChildPath<F[number]>[]>
  : never;
