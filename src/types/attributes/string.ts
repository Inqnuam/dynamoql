import type { AttributeProperties } from "../index";
import type { NumericConditions } from "./number";
import { AttributeTypeConditions } from "./attribute";
import { CustomValidate } from "../schema";
import { CAN_NOT_USE_MULTIPLE_OPERATIONS } from "../utils";

export interface StringProperties {
  type: StringConstructor;
  default?: string | ((item?: Record<string, any>) => Promise<string> | string);
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  capitalize?: boolean;
  minLength?: number;
  maxLength?: number;
  enum?: readonly string[];
  required?: boolean;
  set?: (self?: string, item?: Record<string, any>, setterInfo?: any) => Promise<any> | any;
  get?: (self?: string, item?: Record<string, any>, getterInfo?: any) => Promise<any> | any;
  validate?: CustomValidate;
  description?: any;
}

export type StringAttribute<T, FieldName extends keyof T> = StringProperties & AttributeProperties<T, FieldName>;

type StringConditionsExpr = {
  /**
   * @description checks string's length
   */
  $size?: NumericConditions;
  $not?: StringConditionsExpr;
  $or?: StringConditionsExpr[];
  $and?: StringConditionsExpr[];
  $exists?: boolean;
  /**
   * @description checks if stored string value includes provided value
   *
   * similar to String.prototype.includes
   */
  $includes?: string;
  /**
   * @description checks if string starts with provided value
   *
   * similar to String.prototype.startsWith
   */
  $startsWith?: string;
  $eq?: any;
  $neq?: any;
  $type?: AttributeTypeConditions;
  /**
   * @description checks if stored value is lexicographically greather or equal than `a` and lexicographically lesser or equal than `b`.
   *
   * JS equivalent is:
   * ```ts
   * const normalize = (value: any) => JSON.stringify(marshall(value))
   *
   * const valueStoredInDynamoDBTable = normalize("b")
   *
   * const $between:boolean = valueStoredInDynamoDBTable.localeCompare(normalize("a")) >= 0 && valueStoredInDynamoDBTable.localeCompare(normalize("c")) <= 0;
   * ```
   */

  $between?: [string, string];
  /**
   * @description checks if provided array includes stored value.
   *
   *
   * JS equivalent is:
   * ```ts
   * const normalize = (value: any) => JSON.stringify(marshall(value))
   *
   * const valueStoredInDynamoDBTable = normalize("good value")
   *
   * const possibleValues = ["a", "b", {hello: "WORLD"}, "...", "car", "horse", 4, "good value", "z"]
   *
   * const $in:boolean = possibleValues.map(normalize).includes(valueStoredInDynamoDBTable)
   * ```
   */
  $in?: [any, ...any[]];
  $gt?: string;
  $gte?: string;
  $lte?: string;
  $lt?: string;
};
export type StringConditions<T = string> = StringConditionsExpr | T;

type ValidStringSortKeyExpressions =
  | {
      $gte?: string;
      $gt?: never;
      $lte?: never;
      $lt?: never;
      $eq?: never;
      $between?: never;
      $startsWith?: never;
    }
  | {
      $gte?: never;
      $gt?: string;
      $lte?: never;
      $lt?: never;
      $eq?: never;
      $between?: never;
      $startsWith?: never;
    }
  | {
      $gte?: never;
      $gt?: never;
      $lte?: string;
      $lt?: never;
      $eq?: never;
      $between?: never;
      $startsWith?: never;
    }
  | {
      $gte?: never;
      $gt?: never;
      $lte?: never;
      $lt?: string;
      $eq?: never;
      $between?: never;
      $startsWith?: never;
    }
  | {
      $gte?: never;
      $gt?: never;
      $lte?: never;
      $lt?: never;
      $eq?: string;
      $between?: never;
      $startsWith?: never;
    }
  | {
      $gte?: never;
      $gt?: never;
      $lte?: never;
      $lt?: never;
      $eq?: never;
      $between?: [string, string];
      $startsWith?: never;
    }
  | {
      $gte?: never;
      $gt?: never;
      $lte?: never;
      $lt?: never;
      $eq?: never;
      $between?: never;
      $startsWith?: string;
    };
export type StringSortKeyExpression = string | ValidStringSortKeyExpressions;

export type UpdateStringExpr<T = string> = T | { $set: T; $ifNotExists?: CAN_NOT_USE_MULTIPLE_OPERATIONS } | { $set?: CAN_NOT_USE_MULTIPLE_OPERATIONS; $ifNotExists: T };
