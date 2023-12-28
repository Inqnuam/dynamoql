import { AttributeTypeConditions } from "./attribute";
import type { AttributeProperties } from "../index";
import { CustomValidate } from "../schema";
import { CAN_NOT_USE_MULTIPLE_OPERATIONS } from "../utils";
export const AnyNumber = [{ type: Number }, { type: BigInt }] as const;
export type AnyNumberType = number | bigint;
export interface NumberProperties {
  type: NumberConstructor;
  default?: number | ((item?: Record<string, any>) => Promise<number> | number);
  min?: number;
  max?: number;
  enum?: readonly number[];
  required?: boolean;
  set?: (self?: number, item?: Record<string, any>, setterInfo?: any) => Promise<any> | any;
  get?: (self?: number, item?: Record<string, any>, getterInfo?: any) => Promise<any> | any;
  validate?: CustomValidate;
  description?: any;
}

export type NumberAttribute<T, FieldName extends keyof T> = NumberProperties & AttributeProperties<T, FieldName>;

export type NumericConditionsExpr = {
  /**
   * @description Greater than
   * @example
   * ```json
   * {
   *  age: {
   *    $gt: 12
   *  }
   * }
   * ```
   */
  $gt?: AnyNumberType;
  /**
   * @description Greater or Equal than
   * @example
   * ```json
   * {
   *  age: {
   *    $gte: 12
   *  }
   * }
   * ```
   */
  $gte?: AnyNumberType;
  $lte?: AnyNumberType;
  $lt?: AnyNumberType;
  $eq?: AnyNumberType;
  $neq?: AnyNumberType;
  $in?: [AnyNumberType, ...AnyNumberType[]];
  $between?: [AnyNumberType, AnyNumberType];
};

type NumberAttributeConditions = {
  $not?: NumberAttributeConditions;
  $or?: NumberAttributeConditions[];
  $and?: NumberAttributeConditions[];
  $type?: AttributeTypeConditions;
  $exists?: boolean;
  $in?: [any, ...any[]];
  $between?: [any, any];
} & Omit<NumericConditionsExpr, "$in" | "$between">;

export type NumericConditions = AnyNumberType | NumericConditionsExpr;
export type NumberConditionsExpr = NumericConditions | NumberAttributeConditions;
export type NumberConditions<T> = NumberConditionsExpr | T | AnyNumberType;

export type UpdateNumberExpr<T = AnyNumberType> =
  | T
  | { $incr: T extends bigint ? bigint : number; $decr?: CAN_NOT_USE_MULTIPLE_OPERATIONS; $set?: CAN_NOT_USE_MULTIPLE_OPERATIONS }
  | { $decr: T extends bigint ? bigint : number; $incr?: CAN_NOT_USE_MULTIPLE_OPERATIONS; $set?: CAN_NOT_USE_MULTIPLE_OPERATIONS }
  | { $set: T; $decr?: CAN_NOT_USE_MULTIPLE_OPERATIONS; $incr?: CAN_NOT_USE_MULTIPLE_OPERATIONS; $ifNotExists?: CAN_NOT_USE_MULTIPLE_OPERATIONS }
  | { $ifNotExists: T; $set?: CAN_NOT_USE_MULTIPLE_OPERATIONS; $decr?: CAN_NOT_USE_MULTIPLE_OPERATIONS; $incr?: CAN_NOT_USE_MULTIPLE_OPERATIONS };

export type UpdateEnumNumberExpr<T> = T | { $set: T; $ifNotExists?: CAN_NOT_USE_MULTIPLE_OPERATIONS } | { $ifNotExists: T; $set?: CAN_NOT_USE_MULTIPLE_OPERATIONS };

const ANY_NUMBER_TYPE = new Set(["number", "bigint"]);
export const isNumber = (value: any) => ANY_NUMBER_TYPE.has(typeof value);

type ValidNumberSortKeyExpressions =
  | { $gte?: AnyNumberType; $gt?: never; $lte?: never; $lt?: never; $eq?: never; $between?: never }
  | { $gte?: never; $gt?: AnyNumberType; $lte?: never; $lt?: never; $eq?: never; $between?: never }
  | { $gte?: never; $gt?: never; $lte?: AnyNumberType; $lt?: never; $eq?: never; $between?: never }
  | { $gte?: never; $gt?: never; $lte?: never; $lt?: AnyNumberType; $eq?: never; $between?: never }
  | { $gte?: never; $gt?: never; $lte?: never; $lt?: never; $eq?: AnyNumberType; $between?: never }
  | { $gte?: never; $gt?: never; $lte?: never; $lt?: never; $eq?: never; $between?: [AnyNumberType, AnyNumberType] };

export type NumberSortKeyExpression<T> = T | ValidNumberSortKeyExpressions;
