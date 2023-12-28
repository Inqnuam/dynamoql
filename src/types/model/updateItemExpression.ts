import { UpdateArrayExpr } from "../attributes/array";
import { BinaryProperties, BinaryUpdateExpression } from "../attributes/binary";
import { UpdateBooleanExpr } from "../attributes/boolean";
import { NullConstructor, NullUpdateExpression } from "../attributes/null";
import { NumberProperties, UpdateNumberExpr, UpdateEnumNumberExpr } from "../attributes/number";
import { UpdateKnownObjectExpression } from "../attributes/object";
import { UpdateSetExpression } from "../attributes/set";
import { StringProperties, UpdateStringExpr } from "../attributes/string";
import { ExtractNativeType } from "../schema";
import { SchemaType } from "../utils";
import { BigIntProperties } from "../attributes/bigint";

import { UpdateDateExpression, DateProperties } from "../attributes/date";

export type UpdateItemExpression<T> = T extends StringConstructor | { type: StringConstructor }
  ? UpdateStringExpr<T extends { enum: readonly string[] } ? T["enum"][number][][number] : string>
  : T extends { type: NumberConstructor; enum: readonly number[] }
  ? UpdateEnumNumberExpr<T["enum"][number][][number]>
  : T extends NumberConstructor | { type: NumberConstructor }
  ? UpdateNumberExpr<number>
  : T extends { type: BigIntConstructor; enum: readonly bigint[] }
  ? UpdateEnumNumberExpr<T["enum"][number][][number]>
  : T extends BigIntConstructor | { type: BigIntConstructor }
  ? UpdateNumberExpr<bigint>
  : T extends BooleanConstructor | { type: BooleanConstructor }
  ? UpdateBooleanExpr
  : T extends NullConstructor | { type: NullConstructor }
  ? NullUpdateExpression
  : T extends DateConstructor | { type: DateConstructor }
  ? UpdateDateExpression
  : T extends BufferConstructor | { type: BufferConstructor }
  ? BinaryUpdateExpression
  : T extends {
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
        | DateConstructor
        | DateProperties;
    }
  ? UpdateSetExpression<ExtractNativeType<T["items"]>>
  : T extends ArrayConstructor
  ? UpdateArrayExpr<T>
  : T extends { type: ArrayConstructor }
  ? UpdateArrayExpr<T>
  : T extends { type: ObjectConstructor; fields; allowUndeclared: true }
  ? UpdateKnownObjectExpression<T> & { [index: string]: any }
  : T extends { type: ObjectConstructor; fields }
  ? UpdateKnownObjectExpression<T>
  : T extends readonly [...SchemaType[]]
  ? UpdateItemExpression<T[number]>
  : T extends { __anySchema: true }
  ? any
  : T extends any
  ? any
  : never;
