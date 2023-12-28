import type { GetItemCommandInput, GetItemCommandOutput } from "@aws-sdk/client-dynamodb";

export type GetCommandInputOptions<Fields> = Omit<GetItemCommandInput, "TableName" | "Key" | "AttributesToGet" | "ProjectionExpression" | "ExpressionAttributeNames"> & {
  Select?: Fields;
  exec?: boolean;
  getterInfo?: any;
};
