import { QueryCommandInput, QueryCommandOutput, QueryInput } from "@aws-sdk/client-dynamodb";
import { SelectableFields } from "../schema/getFieldsStringLiteralPaths";
import { ExtractGlob, ExtractSecondarySelectableFields } from "../utils";

type GSIProjectsAll<B, IndexName> = {
  [K in keyof B]: B[K] extends { GSI: { indexName: IndexName; project: "ALL" } } ? "ALL" | "PROJECTED" : "PROJECTED";
}[keyof B];

export type QueryCommandInputOptions<B, IndexName = undefined> = Omit<
  QueryInput,
  | "TableName"
  | "IndexName"
  | "Select"
  | "AttributesToGet"
  | "KeyConditions"
  | "QueryFilter"
  | "ConditionalOperator"
  | "ProjectionExpression"
  | "FilterExpression"
  | "KeyConditionExpression"
  | "ExpressionAttributeNames"
  | "ExpressionAttributeValues"
> & {
  exec?: boolean;
  getterInfo?: any;
  Select?: IndexName extends never | undefined
    ? "COUNT" | "ALL" | SelectableFields<B>
    : ExtractGlob<B, IndexName> extends never
    ? "COUNT" | "ALL" | "PROJECTED" | SelectableFields<B>
    : SelectableFields<ExtractSecondarySelectableFields<B, IndexName>> | "COUNT" | GSIProjectsAll<B, IndexName>;
};

type __QueryOutput<Select, Item> = Omit<QueryCommandOutput, "Items" | "Count" | "ScannedCount"> &
  Pick<{ Items: Item[]; Count: number; ScannedCount: number }, Select extends "COUNT" ? "Count" | "ScannedCount" : "Items" | "Count" | "ScannedCount">;

export type QueryTypedOutput<O, Select, Item> = O extends { exec: false } ? QueryCommandInput : __QueryOutput<Select, Item>;
