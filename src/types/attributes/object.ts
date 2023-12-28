import { UpdateItemExpression } from "../model/updateItemExpression";
import { CustomValidate, ExtractNativeObjectType, ExtractOptionnalKeys, GetFieldType } from "../schema";
import { GetObjectFieldPaths } from "../schema/getFieldsStringLiteralPaths";
import { GetKeyChilds, GetKeyParent, ParsePathSchemaValue } from "../utils";

export interface ISchemaObject<T extends { fields: Record<string, any> }> {
  type: ObjectConstructor;
  fields: SchemaFields<T["fields"]>;
  default?: Record<string, any> | ((item?: Record<string, any>) => Promise<Record<string, any>> | Record<string, any>);
  required?: boolean;
  allowUndeclared?: boolean;
  set?: (self?: Record<string, any>, item?: Record<string, any>, setterInfo?: any) => Promise<any> | any;
  get?: (self?: Record<string, any>, item?: Record<string, any>, getterInfo?: any) => Promise<any> | any;
  validate?: CustomValidate;
  description?: any;
}

type SchemaFields<T extends Record<string, any>> = {
  -readonly [K in keyof T]: GetFieldType<T[K]>;
};

export type IndexPathsUpdateExpressions<T> = {
  -readonly [K in GetObjectFieldPaths<T>]?: K extends keyof T
    ? UpdateItemExpression<T[K]>
    : GetKeyParent<K> extends keyof T
    ? UpdateItemExpression<ParsePathSchemaValue<T[GetKeyParent<K>], GetKeyChilds<K>>>
    : never;
};

export type UpdateKnownObjectExpression<T extends { type: ObjectConstructor; fields: Record<string, any> }> =
  | (IndexPathsUpdateExpressions<T["fields"]> & {
      $set?: never;
      $remove?: never;
      $ifNotExists?: never;
    })
  | ({
      $remove?: never;
      $ifNotExists?: never;
      $set: ExtractNativeObjectType<T>;
    } & {
      -readonly [K in keyof T["fields"]]?: never;
    })
  | ({
      $remove: ExtractOptionnalKeys<T["fields"]> | ExtractOptionnalKeys<T["fields"]>[];
      $set?: never;
      $ifNotExists?: never;
    } & {
      -readonly [K in keyof T["fields"]]?: never;
    })
  | ({
      $remove?: never;
      $set?: never;
      $ifNotExists: ExtractNativeObjectType<T>;
    } & {
      -readonly [K in keyof T["fields"]]?: never;
    });

// $ifNotExists

export const isJsObject = (value: any) => Object.prototype.toString.call(value) == "[object Object]";
