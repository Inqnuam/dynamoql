import { TransactGetItemsCommandInput, TransactGetItemsCommandOutput, TransactWriteItemsInput } from "@aws-sdk/client-dynamodb";
import { updateExpr } from "../model";
import { WithConditions } from "../model/withConditions";
import { PutItem } from "../schema";
import { GetPrimaryKey, GetPartitionKey, GetSortKey } from "../utils";

export type TransactGetOptions<Fields> = Omit<TransactGetItemsCommandInput, "TransactItems"> & { Select?: Fields; exec?: boolean; getterInfo?: any };

export type TransactGetOutput<O, Item> = O extends { exec: false } ? TransactGetItemsCommandInput : Omit<TransactGetItemsCommandOutput, "Responses"> & { Items: Item[] };

export type TransactGetKeySelectInput<Pk, Fields> = { $key: Pk; $select?: Fields };

export type TransactDeleteOptions<B> = Omit<TransactWriteItemsInput, "TransactItems"> & {
  exec?: boolean;
  ReturnValuesOnConditionCheckFailure?: "NONE" | "ALL_OLD";
  check?: (GetPrimaryKey<B, [GetPartitionKey<B>, GetSortKey<B>]> & WithConditions<{ fields: Omit<B, GetPartitionKey<B> | GetSortKey<B>> }>)[];
};

export type TransactPutOptions<B> = Omit<TransactWriteItemsInput, "TransactItems"> & {
  exec?: boolean;
  setterInfo?: any;
  check?: (GetPrimaryKey<B, [GetPartitionKey<B>, GetSortKey<B>]> & WithConditions<{ fields: Omit<B, GetPartitionKey<B> | GetSortKey<B>> }>)[];
};

export type TransactWriteInput<B> = GetPrimaryKey<B, [GetPartitionKey<B>, GetSortKey<B>]> &
  WithConditions<{ fields: Omit<B, GetPartitionKey<B> | GetSortKey<B>> }> extends infer Condition
  ? {
      check?: { condition: Condition; ReturnValuesOnConditionCheckFailure?: "NONE" | "ALL_OLD" }[];
      put?: { item: PutItem<B>; condition?: WithConditions<{ fields: B }>; setterInfo?: any; ReturnValuesOnConditionCheckFailure?: "NONE" | "ALL_OLD" }[];
      update?: { condition: Condition; set: updateExpr<B>; ReturnValuesOnConditionCheckFailure?: "NONE" | "ALL_OLD" }[];
      delete?: { condition: Condition; ReturnValuesOnConditionCheckFailure?: "NONE" | "ALL_OLD" }[];
    }
  : never;

export type TransactUpdateOptions<B> = Omit<TransactWriteItemsInput, "TransactItems"> & {
  exec?: boolean;
  check?: (GetPrimaryKey<B, [GetPartitionKey<B>, GetSortKey<B>]> & WithConditions<{ fields: Omit<B, GetPartitionKey<B> | GetSortKey<B>> }>)[];
};

export type TransactWriteInputOptions = Omit<TransactWriteItemsInput, "TransactItems"> & { exec?: boolean };
