import { IndexSignature, ScalarConstructors, SchemaAnyType, SchemaType } from "../utils";
import { ConstructorTypes } from "../attributes/attribute";

type GetTypeFromUnion<T> = T extends ScalarConstructors | ArrayConstructor | { type: ScalarConstructors }
  ? never
  : T extends { type: ObjectConstructor; fields: Record<string, any>; allowUndeclared: true }
  ? `.${string}`
  : T extends { type: ObjectConstructor; fields: Record<string, any> }
  ? `.${GetObjectFieldPaths<T["fields"]>}`
  : T extends SchemaAnyType | ObjectConstructor
  ? `${IndexSignature}${string}` | `.${string}`
  : T extends { type: ArrayConstructor }
  ? `${IndexSignature}` | `${GetArrayItemsPaths<T>}`
  : never;

type GetArrayItemsPaths<T> = "items" extends keyof T
  ? T["items"] extends ObjectConstructor
    ? `${IndexSignature}` | `${IndexSignature}.${string}`
    : T["items"] extends ConstructorTypes
    ? `${IndexSignature}`
    : T["items"] extends { type: ScalarConstructors }
    ? `${IndexSignature}`
    : T["items"] extends { type: ArrayConstructor }
    ? `${IndexSignature}` | `${IndexSignature}${GetArrayItemsPaths<T["items"]>}`
    : T["items"] extends { type: ObjectConstructor; fields: Record<string, any>; allowUndeclared: true }
    ? `${IndexSignature}` | `${IndexSignature}.${GetObjectFieldPaths<T["items"]["fields"]>}` | `${IndexSignature}.${string}`
    : T["items"] extends { type: ObjectConstructor; fields: Record<string, any> }
    ? `${IndexSignature}` | `${IndexSignature}.${GetObjectFieldPaths<T["items"]["fields"]>}`
    : T["items"] extends SchemaAnyType
    ? `${IndexSignature}` | `${IndexSignature}${IndexSignature}${string}` | `${IndexSignature}.${string}`
    : T["items"] extends readonly [...SchemaType[]]
    ? `${IndexSignature}` | `${IndexSignature}${GetTypeFromUnion<T["items"][number]>}`
    : `${IndexSignature}`
  : `${IndexSignature}`;

export type GetObjectFieldPaths<T> = {
  [K in keyof T]: K extends string
    ? T[K] extends readonly [...SchemaType[]]
      ? K | `${K}${GetTypeFromUnion<T[K][number]>}`
      : T[K] extends ObjectConstructor
      ? K | `${K}.${string}`
      : T[K] extends ConstructorTypes
      ? K
      : T[K] extends { type: ScalarConstructors }
      ? K
      : T[K] extends { type: ArrayConstructor }
      ? K | `${K}${GetArrayItemsPaths<T[K]>}`
      : T[K] extends { type: ObjectConstructor; fields: Record<string, any>; allowUndeclared: true }
      ? K | `${K}.${string}`
      : T[K] extends { type: ObjectConstructor; fields: Record<string, any> }
      ? K | `${K}.${GetObjectFieldPaths<T[K]["fields"]>}`
      : T[K] extends SchemaAnyType
      ? K | `${K}${IndexSignature}${string}` | `${K}.${string}`
      : K
    : never;
}[keyof T];

type GetSchemaStringLiteralPaths<T> = T extends any[] ? GetArrayItemsPaths<T[number]> : GetObjectFieldPaths<T>;

export type SelectableFields<B> = GetSchemaStringLiteralPaths<B>[];
