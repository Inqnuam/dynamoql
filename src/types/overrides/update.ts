import { UpdateItemCommandInput, UpdateItemCommandOutput } from "@aws-sdk/client-dynamodb";

export type UpdateItemOptions = Omit<
  UpdateItemCommandInput,
  | "TableName"
  | "Key"
  | "UpdateExpression"
  | "ExpressionAttributeNames"
  | "ExpressionAttributeValues"
  | "ConditionExpression"
  | "AttributeUpdates"
  | "Expected"
  | "ConditionalOperator"
> & { exec?: boolean };

type UpdateCommandTypedAttributeOutput<O, Item> = "ReturnValues" extends keyof O
  ? O["ReturnValues"] extends never | "NONE"
    ? Omit<UpdateItemCommandOutput, "Attributes">
    : Omit<UpdateItemCommandOutput, "Attributes"> & { Attributes: O["ReturnValues"] extends "UPDATED_NEW" | "UPDATED_OLD" ? Record<string, any> : Item }
  : Omit<UpdateItemCommandOutput, "Attributes">;

export type UpdateCommandTypedOutput<O, Item> = O extends { exec: false } ? UpdateItemCommandInput : UpdateCommandTypedAttributeOutput<O, Item>;
