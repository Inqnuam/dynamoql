import { ScanCommandOutput, ScanCommandInput, ScanInput } from "@aws-sdk/client-dynamodb";

import { SelectableFields } from "../schema/getFieldsStringLiteralPaths";
import { ExtractGlob, ExtractSecondarySelectableFields } from "../utils";

type GSIProjectsAll<B, IndexName> = {
  [K in keyof B]: B[K] extends { GSI: { indexName: IndexName; project: "ALL" } } ? "ALL" | "PROJECTED" : "PROJECTED";
}[keyof B];

export type ScanCommandInputOptions<B, IndexName = undefined> = Omit<
  ScanInput,
  | "TableName"
  | "IndexName"
  | "Select"
  | "AttributesToGet"
  | "ScanFilter"
  | "ConditionalOperator"
  | "ProjectionExpression"
  | "FilterExpression"
  | "KeyConditionExpression"
  | "ExpressionAttributeNames"
  | "ExpressionAttributeValues"
  | "ConsistentRead"
> & {
  exec?: boolean;
  getterInfo?: any;
  ConsistentRead?: ExtractGlob<B, IndexName> extends never ? ScanInput["ConsistentRead"] : never | false;
  Select?: IndexName extends never | undefined
    ? "COUNT" | "ALL" | SelectableFields<B>
    : ExtractGlob<B, IndexName> extends never
    ? "COUNT" | "ALL" | "PROJECTED" | SelectableFields<B>
    : SelectableFields<ExtractSecondarySelectableFields<B, IndexName>> | "COUNT" | GSIProjectsAll<B, IndexName>;
};

type __ScanOutput<Select, Item> = Omit<ScanCommandOutput, "Items" | "Count" | "ScannedCount"> &
  Pick<{ Items: Item[]; Count: number; ScannedCount: number }, Select extends "COUNT" ? "Count" | "ScannedCount" : "Items" | "Count" | "ScannedCount">;

export type ScanTypedOutput<O, Select, Item> = O extends { exec: false } ? ScanCommandInput : __ScanOutput<Select, Item>;
