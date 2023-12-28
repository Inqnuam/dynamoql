import { CAN_NOT_USE_MULTIPLE_OPERATIONS } from "../utils";
import { AttributeTypeConditions } from "./attribute";

export interface BooleanProperties {
  type: BooleanConstructor;
  default?: boolean | ((item?: Record<string, any>) => Promise<boolean> | boolean);
  required?: boolean;
  set?: (self?: boolean, item?: Record<string, any>, setterInfo?: any) => Promise<any> | any;
  get?: (self?: boolean, item?: Record<string, any>, getterInfo?: any) => Promise<any> | any;
  description?: any;
}

export type UpdateBooleanExpr = boolean | { $set: boolean; $ifNotExists?: CAN_NOT_USE_MULTIPLE_OPERATIONS } | { $set?: CAN_NOT_USE_MULTIPLE_OPERATIONS; $ifNotExists: boolean };

export type BooleanConditions =
  | boolean
  | {
      $exists?: boolean;
      $eq?: any;
      $neq?: any;
      $type?: AttributeTypeConditions;
      $in?: [any, ...any[]];
    };
