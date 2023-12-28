import type { AttributeProperties } from "../index";
import { CustomValidate } from "../schema";

export interface BigIntProperties {
  type: BigIntConstructor;
  default?: bigint | ((item?: Record<string, any>) => Promise<bigint> | bigint);
  min?: bigint;
  max?: bigint;
  enum?: readonly [...bigint[]];
  required?: boolean;
  set?: (self?: bigint, item?: Record<string, any>, setterInfo?: any) => Promise<any> | any;
  get?: (self?: bigint, item?: Record<string, any>, getterInfo?: any) => Promise<any> | any;
  validate?: CustomValidate;
  description?: any;
}

export type BigIntAttribute<T, FieldName extends keyof T> = BigIntProperties & AttributeProperties<T, FieldName>;
