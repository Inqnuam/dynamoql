import { NativeAttributeBinary } from "@aws-sdk/util-dynamodb";
import { ConstructorTypes } from "./attributes/attribute";
import { NullConstructor } from "./attributes/null";
import { AnyNumberType } from "./attributes/number";

import { ExtractNativeType } from "./schema";
import { GetSortKeyExpression, WithConditions } from "./model/withConditions";

export type CAN_NOT_USE_MULTIPLE_OPERATIONS = { _RUNTIME_ERROR_: `❌⛔️ Can not use multiple Update Expressions with the same Attribute ❗️` };

export type NonNeverFields<T> = {
  [K in keyof T]: T[K] extends undefined ? never : K;
}[keyof T];

export type IsAny<T> = 0 extends 1 & T ? true : false;
export type ScalarTypes = string | AnyNumberType | boolean | null | undefined | Set<AnyNumberType | string | NativeAttributeBinary | Date> | NativeAttributeBinary | Date;
export type ScalarConstructors =
  | StringConstructor
  | NumberConstructor
  | BigIntConstructor
  | BooleanConstructor
  | SetConstructor
  | NullConstructor
  | BufferConstructor
  | DateConstructor;
export interface SchemaAnyType {
  type: ObjectConstructor;
}

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
export type SchemaType = ConstructorTypes | { type }; // | StringProperties | NumberProperties | BigIntProperties | BooleanProperties | BinaryProperties

export type IndexSignature = `[${number | `#`}]`;

export type GetKeyChilds<K> = K extends `${IndexSignature}.${infer Child}`
  ? Child
  : K extends `${IndexSignature}[${infer Child}`
  ? `[${Child}`
  : K extends `${infer Parent}.${infer Child}`
  ? `${GetKeyChilds<Parent>}.${Child}` extends `${Parent}.${Child}`
    ? Child
    : `${GetKeyChilds<Parent>}.${Child}`
  : K extends `${string}[${infer Child}`
  ? `[${Child}`
  : K;

export type GetKeyParent<K extends string> = K extends `[${infer Parent extends number}].${string}`
  ? `[${Parent}]`
  : K extends `[${infer Parent extends number}][${string}`
  ? `[${Parent}]`
  : K extends `${infer Parent}.${string}`
  ? `${GetKeyParent<Parent>}` extends Parent
    ? Parent
    : GetKeyParent<Parent>
  : K extends `${infer Parent}[${string}`
  ? Parent
  : K;

type GetArrayChild<K> = K extends `${IndexSignature}.${infer Child}` ? Child : K extends `${IndexSignature}[${infer Child}` ? `[${Child}` : never;

export type ParsePathSchemaValue<T, K extends string> = T extends ScalarConstructors | { type: ScalarConstructors }
  ? T
  : T extends { type: ArrayConstructor; items }
  ? K extends `${IndexSignature}`
    ? T["items"]
    : K extends `${IndexSignature}.${string}` | `${IndexSignature}[${string}`
    ? ParsePathSchemaValue<T["items"], GetArrayChild<K>>
    : never
  : T extends { type: ObjectConstructor; fields: Record<string, any> }
  ? K extends keyof T["fields"]
    ? T["fields"][K]
    : GetKeyParent<K> extends keyof T["fields"]
    ? ParsePathSchemaValue<T["fields"][GetKeyParent<K>], GetKeyChilds<K>>
    : T extends { allowUndeclared: true }
    ? { __anySchema: true }
    : never
  : T extends readonly [...SchemaType[]]
  ? K extends `${IndexSignature}`
    ? ParsePathSchemaValue<T[number], "">
    : ParsePathSchemaValue<T[number], K>
  : never;

const INDEXABLES = ["S", "N", "B", "D"];
const N_SCALR = [...INDEXABLES, "BOOL", "NULL"];
const isNotNestable = (t: string) => N_SCALR.includes(t);

export { INDEXABLES, isNotNestable };

type UsingSecondaryIndex<B, IndexName extends string> = Required<Record<GetPartitionKey<B>, ExtractNativeType<B[GetPartitionKey<B>]>>> &
  GetSortKeyExpression<B, ExtractSec<B, IndexName>> &
  WithConditions<{ fields: Omit<SecondaryIndexConditions<B, IndexName>, GetPartitionKey<B> | ExtractSec<B, IndexName>> }>;

export type GetPartitionKey<T> = {
  [K in keyof T]: T[K] extends { primaryIndex: true } ? K : never;
}[keyof T];

type ExtractSec<T, IndexName> = {
  [K in keyof T]: T[K] extends { LSI: { indexName: IndexName } } ? K : never;
}[keyof T];

export type ExtractGlob<T, IndexName> = {
  [K in keyof T]: T[K] extends { GSI: { indexName: IndexName } } ? K : never;
}[keyof T];

export type GetPartitionKeyNativeType<B> = GetPartitionKey<B> extends keyof B ? ExtractNativeType<B[GetPartitionKey<B>]> : never;

type UsingGlobalIndex<B, IndexName extends string> = Required<Record<GetGlobalPartitionKey<B, IndexName>, ExtractNativeType<B[GetGlobalPartitionKey<B, IndexName>]>>> &
  (GetGlobalSortKey<B, IndexName> extends string
    ? WithConditions<{
        fields: Omit<
          FilterByKey<B, ExtractSchemaFieldsFromGlobal<B, IndexName> extends string[] ? ExtractSchemaFieldsFromGlobal<B, IndexName> : []>,
          GetGlobalPartitionKey<B, IndexName> | GetGlobalSortKey<B, IndexName>
        >;
      }> &
        GetSortKeyExpression<B, GetGlobalSortKey<B, IndexName>>
    : WithConditions<{
        fields: FilterByKey<B, ExtractSchemaFieldsFromGlobal<B, IndexName> extends string[] ? ExtractSchemaFieldsFromGlobal<B, IndexName> : []>;
      }>);

export type GetGlobalSortKey<T, IndexName extends string> = {
  [K in keyof T]: T[K] extends { GSI: { sortKey: true; indexName: IndexName } } ? K : never;
}[keyof T];

type GetGlobalPartitionKey<T, IndexName extends string> = {
  [K in keyof T]: T[K] extends { GSI: { sortKey?: false; indexName: IndexName } } ? K : never;
}[keyof T];

type ExtractGlobalProjectValues<T, Project, IndexName extends string> = Project extends readonly string[]
  ? [...Project, GetPartitionKey<T>, GetSortKey<T>, GetGlobalSortKey<T, IndexName>]
  : Project extends "ALL"
  ? [keyof T]
  : Project extends "KEYS"
  ? [GetPartitionKey<T>, GetSortKey<T>, GetGlobalSortKey<T, IndexName>]
  : never;

type ExtractSchemaFieldsFromGlobal<T, IndexName extends string> = {
  [K in keyof T]: T[K] extends { GSI: { project: ProjectType; indexName: infer IName } }
    ? IName extends IndexName
      ? ExtractGlobalProjectValues<T, T[K]["GSI"]["project"], IndexName>
      : never
    : never;
}[keyof T];

type FilterByKey<T, F extends string[]> = {
  [K in F[number]]: K extends keyof T ? T[K] : never;
};

type SecondaryIndexConditions<T, IndexName> = ExtractSchemaFromSecondary<T, IndexName> extends infer U
  ? FilterByKey<
      T,
      {
        [K in keyof U]: U[K] extends any[] ? U[K] : never;
      }[keyof U]
    >
  : never;

export type GetSortKey<T> = {
  [K in keyof T]: T[K] extends { sortKey: true } ? K : never;
}[keyof T];

type ProjectType = "ALL" | "KEYS" | readonly string[];
type ExtractSecondaryProjectValues<T, Project, FieldName extends string | number | symbol> = Project extends readonly string[]
  ? [...Project, FieldName, GetPartitionKey<T>, GetSortKey<T>]
  : Project extends "ALL"
  ? [keyof T]
  : Project extends "KEYS"
  ? [FieldName, GetSortKey<T>]
  : never;

export type ExtractSchemaFromSecondary<T, IndexName> = {
  [K in keyof T]: T[K] extends { LSI: { project: ProjectType; indexName: infer IName } }
    ? IName extends IndexName
      ? ExtractSecondaryProjectValues<T, T[K]["LSI"]["project"], K>
      : never
    : never;
};

export type GetPrimaryKey<T, HashRangeKey extends (keyof T)[]> = {
  [K in HashRangeKey[number]]: K extends keyof T ? ExtractNativeType<T[K]> : never;
};

export type SecondaryQueryConditions<B, IndexName> = IndexName extends string
  ? ExtractSec<B, IndexName> extends never
    ? ExtractGlob<B, IndexName> extends never
      ? never
      : UsingGlobalIndex<B, IndexName>
    : UsingSecondaryIndex<B, IndexName>
  : never;

type ExtractSchemaFieldsFromSecondary<T, IndexName> = {
  [K in keyof T]: T[K] extends { LSI: { project: ProjectType; indexName: infer IName } }
    ? IName extends IndexName
      ? ExtractSecondaryProjectValues<T, T[K]["LSI"]["project"], K>
      : never
    : never;
}[keyof T];

export type ExtractSecondarySchema<B, IndexName> = IndexName extends string
  ? ExtractSec<B, IndexName> extends never
    ? ExtractGlob<B, IndexName> extends never
      ? never
      : {
          [K in ExtractSchemaFieldsFromGlobal<B, IndexName>[number]]: K extends keyof B ? B[K] : never;
        }
    : { [K in ExtractSchemaFieldsFromSecondary<B, IndexName>[number]]: K extends keyof B ? B[K] : never }
  : never;

export type ExtractSecondarySelectableFields<B, IndexName> = IndexName extends string
  ? ExtractSec<B, IndexName> extends never
    ? ExtractGlob<B, IndexName> extends never
      ? never
      : {
          [K in ExtractSchemaFieldsFromGlobal<B, IndexName>[number]]: K extends keyof B ? B[K] : never;
        }
    : B
  : never;

export type RequireSecondaryIndices<B, Item, IndexName> = IndexName extends string
  ? ExtractSec<B, IndexName> extends never
    ? ExtractGlob<B, IndexName> extends string
      ? Required<Pick<Item, ExtractGlob<B, IndexName> extends keyof Item ? ExtractGlob<B, IndexName> : never>> & Omit<Item, ExtractGlob<B, IndexName>>
      : never
    : Required<Pick<Item, ExtractSec<B, IndexName> extends keyof Item ? ExtractSec<B, IndexName> : never>> & Omit<Item, ExtractSec<B, IndexName>>
  : never;

type GetProjectedFields<B, IndexName> = {
  [K in keyof B]: B[K] extends { GSI: { indexName: IndexName; project: infer P } }
    ? P extends readonly string[]
      ? P[number]
      : never
    : B[K] extends { LSI: { indexName: IndexName; project: infer P } }
    ? P extends readonly string[]
      ? P[number]
      : never
    : never;
}[keyof B];

export type ExtractSchemaFromNativeSelect<B, IndexName, Select extends undefined | "ALL" | "PROJECTED"> = Select extends "ALL"
  ? B
  : IndexName extends string
  ? ExtractSec<B, IndexName> extends never
    ? ExtractGlob<B, IndexName> extends never
      ? never
      : B[ExtractGlob<B, IndexName>] extends { GSI: { project: "ALL" } }
      ? B
      : B[ExtractGlob<B, IndexName>] extends { GSI: { project: "KEYS" } }
      ? Pick<B, GetPartitionKey<B> | ExtractGlob<B, IndexName> | GetGlobalSortKey<B, IndexName>>
      : Pick<B, GetPartitionKey<B> | GetSortKey<B> | ExtractGlob<B, IndexName> | GetGlobalSortKey<B, IndexName> | GetProjectedFields<B, IndexName>>
    : B[ExtractSec<B, IndexName>] extends { LSI: { project: "ALL" } }
    ? B
    : Pick<B, GetPartitionKey<B> | GetSortKey<B> | ExtractSec<B, IndexName> | GetProjectedFields<B, IndexName>>
  : never;

export type GetSelectValue<Options> = Options extends { Select: "COUNT" | "ALL" | "PROJECTED" | readonly string[] } ? Options["Select"] : "PROJECTED";
