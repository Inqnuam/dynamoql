import { AttributeTypeConditions } from "./attribute";
import { NumericConditions } from "./number";
import { CustomValidate, ExtractNativeType, GetFieldType } from "../schema";
import { SchemaType, CAN_NOT_USE_MULTIPLE_OPERATIONS } from "../utils";
import { UpdateItemExpression } from "../model/updateItemExpression";
import { SchemaCondition } from "../model/withConditions";

export type ISchemaArray<T extends { items }> = {
  type: ArrayConstructor;
  default?: readonly any[] | (() => Promise<any[]> | any[]);
  required?: boolean;
  items: GetFieldType<T["items"]>;
  set?: (self?: any[], item?: any, setterInfo?: any) => Promise<any> | any;
  get?: (self?: any[], item?: any, getterInfo?: any) => Promise<any> | any;
  validate?: CustomValidate;
  description?: any;
};

type ArrayUpdateExpressionSet<T> = {
  $set: T[];
  $remove?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $push?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $unshift?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $ifNotExists?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  [index: `[${number}]`]: never;
};

interface ArrayUpdateExpressionPush<T> {
  /**
       * @description Push an item or an array of items into an existing array

       * @example
       * ```json
       * {
       *  hobbies: { 
       *    $push: "Tennis"
       *  }
       * }
       * ```
       * @example
       * ```json
       * {
       *  hobbies: { 
       *    $push: ["Tennis", "Golf"] 
       *  }
       * }
       * ```
       * @alias `SET a = list_append(a, b)`
       */
  $push: T | T[];
  $set?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $remove?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $unshift?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $ifNotExists?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  [index: `[${number}]`]: never;
}

interface ArrayUpdateExpressionUnshift<T> {
  /**
       * @description add the specified element(s) to the beginning of an array 

       * @example
       * ```json
       * {
       *  hobbies: { 
       *    $unshift: "Tennis"
       *  }
       * }
       * ```
       * @example
       * ```json
       * {
       *  hobbies: { 
       *    $unshift: ["Tennis", "Golf"] 
       *  }
       * }
       * ```
       * @alias `SET a = list_append(b, a)`
       */
  $unshift: T | T[];
  $push?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $set?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $remove?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $ifNotExists?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  [index: `[${number}]`]: never;
}

interface ArrayUpdateExpressionRemove<T> {
  $remove: number | number[];
  $unshift?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $push?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $set?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $ifNotExists?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  [index: `[${number}]`]: never;
}

interface ArrayUpdateExpressionIfNotExists<T> {
  $ifNotExists: T[];
  $remove?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $unshift?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $push?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $set?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  [index: `[${number}]`]: never;
}

export interface ArrayIndexUpdateExpression<T extends any[], B> {
  $ifNotExists?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $remove?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $unshift?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $push?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $set?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  [index: `[${number}]`]: Partial<UpdateItemExpression<B extends { items: any } ? B["items"] : any>>;
}

interface ArrayElementCondition<T> {
  [key: `[${number}]`]: SchemaCondition<T>;
}

export type ArrayConditions<T> = ExtractNativeType<T> extends infer Item
  ?
      | Item[]
      | ArrayElementCondition<T>
      | {
          $size?: NumericConditions;
          $eq?: any;
          $neq?: any;
          $includes?: Item;
          $exists?: boolean;
          $type?: AttributeTypeConditions;
        }
      | {
          $and?: ArrayConditions<T>[];
          $or?: ArrayConditions<T>[];
          $not?: ArrayConditions<T>;
        }
  : never;

type GetArrayItemsNativeType<T> = T extends { items }
  ? T["items"] extends readonly [...SchemaType[]]
    ? ExtractNativeType<T["items"][number]>
    : ExtractNativeType<T["items"]>
  : any;
type GetArrayItemsType<T> = T extends { items } ? (T["items"] extends readonly [...SchemaType[]] ? T["items"][number] : T["items"]) : any;

export type UpdateArrayExpr<T> = GetArrayItemsNativeType<T> extends infer Item
  ?
      | (
          | Item[]
          | ArrayUpdateExpressionSet<Item>
          | ArrayUpdateExpressionPush<Item>
          | ArrayUpdateExpressionUnshift<Item>
          | ArrayUpdateExpressionRemove<Item>
          | ArrayUpdateExpressionIfNotExists<Item>
        )
      | ArrayIndexUpdateExpression2<T>
  : never;

export type ArrayIndexUpdateExpression2<T> = {
  $ifNotExists?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $remove?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $unshift?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $push?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $set?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  [index: `[${number}]`]: UpdateItemExpression<GetArrayItemsType<T>>;
};
