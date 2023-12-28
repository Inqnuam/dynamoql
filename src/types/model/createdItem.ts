/**
 *  Get Put command's created Item interface
 */

import type { PutItemCommandInput, PutItemCommandOutput, BatchWriteItemCommandInput, BatchWriteItemCommandOutput } from "@aws-sdk/client-dynamodb";
import { NonNeverFields, ScalarTypes } from "../utils";

export type GetReturnedType<D> = D extends (...args: any) => any ? Awaited<ReturnType<D>> : D;

type GetObjectType<S, PutItem> = S extends { type: ObjectConstructor }
  ? S extends { fields }
    ? {
        -readonly [K in keyof S["fields"]]: K extends keyof PutItem
          ? GetType<S["fields"][K], PutItem[K]>
          : S["fields"][K] extends { default }
          ? GetReturnedType<S["fields"][K]["default"]>
          : never;
      }
    : PutItem
  : S extends ObjectConstructor
  ? PutItem
  : never;

type GetArrayItemType<S, PutItem> = S extends { type: ArrayConstructor }
  ? S extends { items }
    ? PutItem extends ScalarTypes
      ? PutItem
      : GetType<S["items"], PutItem>
    : PutItem
  : S extends ArrayConstructor
  ? PutItem
  : never;

type GetType<S, PutItem> = PutItem extends ScalarTypes
  ? S extends { type: DateConstructor }
    ? number
    : PutItem
  : PutItem extends readonly any[]
  ? GetArrayItemType<S, PutItem[number]>[]
  : PutItem extends Record<string, any>
  ? GetObjectType<S, PutItem>
  : never;

export type CreatedItem<S, PutItem> = {
  -readonly [K in keyof S]: K extends keyof PutItem ? GetType<S[K], PutItem[K]> : S[K] extends { default } ? GetReturnedType<S[K]["default"]> : never;
} extends infer Item
  ? Pick<Item, NonNeverFields<Item>>
  : never;

type __PutItemCommandOutput = Omit<PutItemCommandOutput, "Attributes">;
type ___PutItemCommandOutput<O, Stored> = O extends { ReturnValues: "ALL_OLD" } ? __PutItemCommandOutput & { Attributes?: Stored } : __PutItemCommandOutput;
export type PutItemResponse<S, O, I, Stored> = Promise<O extends { exec: false } ? PutItemCommandInput : ___PutItemCommandOutput<O, Stored> & { Item: CreatedItem<S, I> }>;

export type BatchPutOutput<O, S, Item, TableName extends string> = Promise<
  O extends { exec: false }
    ? BatchWriteItemCommandInput
    : Omit<BatchWriteItemCommandOutput, "UnprocessedItems"> & {
        Items: CreatedItem<S, Item>[];
        UnprocessedItems?: Record<
          TableName,
          {
            PutRequest: {
              Item: CreatedItem<S, Item>;
            };
          }[]
        >;
      }
>;

export type BatchDeleteOutput<O, Key, TableName extends string> = Promise<
  O extends { exec: false }
    ? BatchWriteItemCommandInput
    : Omit<BatchWriteItemCommandOutput, "UnprocessedItems"> & {
        UnprocessedItems?: Record<
          TableName,
          {
            DeleteRequest: {
              Item: Key;
            };
          }[]
        >;
      }
>;

export type BatchWriteOutput<O, S, Key, Item, TableName extends string> = Promise<
  O extends { exec: false }
    ? BatchWriteItemCommandInput
    : Omit<BatchWriteItemCommandOutput, "UnprocessedItems"> & {
        Items: CreatedItem<S, Item>[];
        UnprocessedItems?: Record<
          TableName,
          {
            PutRequest?: {
              Item: CreatedItem<S, Item>;
            };
            DeleteRequest?: {
              Item: Key;
            };
          }[]
        >;
      }
>;
