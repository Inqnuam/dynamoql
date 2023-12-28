import { CreateTableCommandInput, CreateTableCommandOutput, UpdateTableCommandInput } from "@aws-sdk/client-dynamodb";

export type CreateTableOptions = Omit<CreateTableCommandInput, "TableName" | "AttributeDefinitions" | "KeySchema" | "LocalSecondaryIndexes" | "GlobalSecondaryIndexes"> & {
  exec?: boolean;
};

export type CreateTableTypedOutput<Options> = Promise<Options extends { exec: false } ? CreateTableCommandInput : CreateTableCommandOutput>;

export type TableBasicOptions = { exec?: boolean };

export type UpdateTableOptions = Omit<UpdateTableCommandInput, "TableName"> & { exec?: boolean };
