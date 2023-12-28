import { ArrayConditions } from "../attributes/array";
import { AttributeTypeConditions } from "../attributes/attribute";
import { BinaryConditions, BinaryInstance, BinarySortKeyExpression } from "../attributes/binary";
import { BooleanConditions } from "../attributes/boolean";
import { DateConditionExpression, DateSortKeyExpression } from "../attributes/date";
import { NullConditions, NullConstructor } from "../attributes/null";
import { NumberConditions, NumericConditions, NumberSortKeyExpression } from "../attributes/number";
import { SetConditions } from "../attributes/set";
import { StringConditions, StringSortKeyExpression } from "../attributes/string";
import { ExtractNativeType } from "../schema";
import { GetObjectFieldPaths } from "../schema/getFieldsStringLiteralPaths";
import { GetKeyParent, ParsePathSchemaValue, GetKeyChilds, SchemaType } from "../utils";

export type SchemaCondition<T> = T extends StringConstructor
  ? StringConditions<string>
  : T extends { type: StringConstructor }
  ? StringConditions
  : T extends NumberConstructor
  ? NumberConditions<number>
  : T extends { type: NumberConstructor }
  ? NumberConditions<number>
  : T extends BigIntConstructor
  ? NumberConditions<bigint>
  : T extends ObjectConstructor
  ? any
  : T extends { type: BigIntConstructor }
  ? NumberConditions<bigint>
  : T extends BooleanConstructor | { type: BooleanConstructor }
  ? BooleanConditions
  : T extends DateConstructor | { type: DateConstructor }
  ? DateConditionExpression
  : T extends NullConstructor | { type: NullConstructor }
  ? NullConditions
  : T extends { type: SetConstructor; items: StringConstructor | { type: StringConstructor } }
  ? SetConditions<string>
  : T extends { type: SetConstructor; items: NumberConstructor | { type: NumberConstructor } }
  ? SetConditions<number>
  : T extends { type: SetConstructor; items: BigIntConstructor | { type: BigIntConstructor } }
  ? SetConditions<bigint>
  : T extends { type: SetConstructor; items: BufferConstructor | { type: BufferConstructor } }
  ? SetConditions<Buffer>
  : T extends { type: SetConstructor; items: DateConstructor | { type: DateConstructor } }
  ? SetConditions<Date>
  : T extends { type: ArrayConstructor; items }
  ? ArrayConditions<T["items"]>
  : T extends { type: ObjectConstructor; fields: Record<string, any> }
  ? WithNestedConditions<T>
  : T extends BufferConstructor | { type: BufferConstructor }
  ? BinaryConditions
  : T extends readonly [...SchemaType[]]
  ? SchemaCondition<T[number]>
  : T extends { type: readonly [...SchemaType[]] }
  ? SchemaCondition<T["type"][number]>
  : never;

type UpdateConditions<T extends { fields }> = {
  -readonly [K in GetObjectFieldPaths<T["fields"]>]?: K extends keyof T["fields"]
    ? SchemaCondition<T["fields"][K]>
    : GetKeyParent<K> extends keyof T["fields"]
    ? SchemaCondition<ParsePathSchemaValue<T["fields"][GetKeyParent<K>], GetKeyChilds<K>>>
    : never;
};

type LogicalOperations<T extends { fields }> = { $and?: WithConditions<T>[]; $or?: WithConditions<T>[]; $not?: WithConditions<T> };
type NestedLogicalOperations<T extends { fields }> = { $and?: WithNestedConditions<T>[]; $or?: WithNestedConditions<T>[]; $not?: WithNestedConditions<T> };

type CommonConditions = {
  $eq?: any;
  $neq?: any;
  $type?: AttributeTypeConditions;
  /**
   * @description similar to Object.keys(myAwsomeObject).length > 12 etc.
   * @example
   * ```json
   * {
   *  myAwsomeObject: {
   *    $gt: 12
   *  }
   * }
   * ```
   */
  $size?: NumericConditions;
  $not?: CommonConditions;
  $exists?: boolean;
};

export type WithNestedConditions<T extends { fields }> = T extends { allowUndeclared: true }
  ? (UpdateConditions<T> & NestedLogicalOperations<T> & { [index: string]: any }) | CommonConditions
  : (UpdateConditions<T> & NestedLogicalOperations<T>) | CommonConditions;

export type WithConditions<T extends { fields }> = T extends { allowUndeclared: true }
  ? UpdateConditions<T> & LogicalOperations<T> & { [index: string]: any }
  : UpdateConditions<T> & LogicalOperations<T>;

type ExtractSortKeyExpression<T> = T extends number | bigint
  ? T | NumberSortKeyExpression<T>
  : T extends string
  ? StringSortKeyExpression
  : T extends BinaryInstance
  ? BinarySortKeyExpression
  : T extends Date
  ? DateSortKeyExpression
  : never;

export type GetSortKeyExpression<B, SortKey extends keyof B> = Partial<Record<SortKey, ExtractSortKeyExpression<ExtractNativeType<B[SortKey]>>>>;
