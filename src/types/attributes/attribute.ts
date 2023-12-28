import { BigIntProperties } from "./bigint";
import { BinaryProperties } from "./binary";
import { NullConstructor } from "./null";
import { NumberProperties } from "./number";
import { StringProperties } from "./string";

export type ConstructorTypes =
  | StringConstructor
  | NumberConstructor
  | BigIntConstructor
  | BooleanConstructor
  | NullConstructor
  | BufferConstructor
  | DateConstructor
  | ObjectConstructor;
export type AttributeTypeConditions =
  | ConstructorTypes
  | ArrayConstructor
  | DateConstructor
  | {
      type: SetConstructor;
      items:
        | StringConstructor
        | StringProperties
        | NumberConstructor
        | NumberProperties
        | BigIntConstructor
        | BigIntProperties
        | BufferConstructor
        | BinaryProperties
        | DateConstructor;
    };
