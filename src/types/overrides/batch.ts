import { BatchGetItemCommandInput, BatchGetItemCommandOutput, BatchWriteItemCommandInput } from "@aws-sdk/client-dynamodb";

export interface BatchGetOptions<Fields> {
  ConsistentRead?: boolean;
  Select?: Fields;
  ReturnConsumedCapacity?: BatchGetItemCommandInput["ReturnConsumedCapacity"];
  exec?: boolean;
  getterInfo?: any;
}

export type BatchGetTypedOutput<Item, TableName extends string, Key> = Omit<BatchGetItemCommandOutput, "Responses" | "UnprocessedKeys"> & {
  Items?: Item[];
  UnprocessedKeys?: Record<
    TableName,
    {
      Keys: Key[];
      ConsistentRead?: boolean;
    }
  >;
};

export interface BatchWriteOptions {
  ReturnConsumedCapacity?: BatchWriteItemCommandInput["ReturnConsumedCapacity"];
  ReturnItemCollectionMetrics?: BatchWriteItemCommandInput["ReturnItemCollectionMetrics"];
  exec?: boolean;
  setterInfo?: any;
}
