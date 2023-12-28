import { CAN_NOT_USE_MULTIPLE_OPERATIONS } from "../utils";
import { AttributeTypeConditions } from "./attribute";

function _null() {
  return null;
}
_null.isNull = true;

export const Null: NullConstructor = _null;

export interface NullConstructor {
  (): null;
  isNull: boolean;
}
export type NullConditions = null | {
  $exists?: boolean;
  $eq?: any;
  $neq?: any;
  $type?: AttributeTypeConditions;
  $in?: [any, ...any[]];
};

export type NullUpdateExpression = null | { $set: null; $ifNotExists?: CAN_NOT_USE_MULTIPLE_OPERATIONS } | { $set?: CAN_NOT_USE_MULTIPLE_OPERATIONS; $ifNotExists: null };

export type NullProperties = {
  type: NullConstructor;
  required?: boolean;
  default?: null | ((item?: Record<string, any>) => Promise<null> | null);
  set?: (self?: null, item?: Record<string, any>, setterInfo?: any) => Promise<any> | any;
  get?: (self?: null, item?: Record<string, any>, getterInfo?: any) => Promise<any> | any;
  description?: any;
};
