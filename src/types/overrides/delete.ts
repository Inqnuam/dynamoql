import { DeleteItemCommandInput } from "@aws-sdk/client-dynamodb";

export type DeleteItemOptions = Omit<
  DeleteItemCommandInput,
  "TableName" | "Key" | "ConditionExpression" | "ExpressionAttributeNames" | "ExpressionAttributeValues" | "ConditionalOperator" | "Expected" | "ReturnValues"
> & { ReturnValues?: "NONE" | "ALL_OLD"; exec?: boolean };
