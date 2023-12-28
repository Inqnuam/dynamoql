import {
  DynamoDBClient,
  UpdateItemCommand,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  QueryCommand,
  DynamoDBClientConfig,
  CreateTableCommand,
  DescribeTableCommand,
  DeleteItemCommand,
  DeleteTableCommand,
  BatchGetItemCommand,
  BatchWriteItemCommand,
  TransactGetItemsCommand,
  TransactWriteItemsCommand,
} from "@aws-sdk/client-dynamodb";
import type {
  UpdateItemCommandInput,
  UpdateItemCommandOutput,
  PutItemCommandOutput,
  GetItemCommandInput,
  GetItemCommandOutput,
  BatchWriteItemCommandInput,
  BatchGetItemCommandInput,
  DeleteTableCommandInput,
  UpdateTableCommandInput,
  DeleteItemCommandInput,
  DescribeTableCommandOutput,
  DescribeTableCommandInput,
  CreateTableCommandInput,
  PutItemCommandInput,
  ScanCommandInput,
  QueryCommandInput,
  TransactGetItemsCommandInput,
  TransactWriteItemsCommandInput,
  TransactWriteItemsCommandOutput,
  DeleteItemCommandOutput,
  DeleteTableCommandOutput,
  UpdateTableCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { Schema } from "./schema";

import { applyStringTransformers } from "./transformers/applyStringTransformers";
import { applyCustomSetters } from "./transformers/applyCustomSetters";
import { setDefaultFields } from "./transformers/setDefaultFields";
import { getUpdateExpressions } from "./common/getUpdateExpressions";
import { ExpressionAttributes, serializeConditionExpression } from "./expressions";
import { getConditionExpressions } from "./common/getConditionExpressions";
import { isJsObject } from "./types/attributes/object";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { marshallOptions, unmarshallOptions } from "@aws-sdk/util-dynamodb";
import type { updateExpr } from "./types/model";
import type { ExtractNativeType, PutItem, selectAlias } from "./types/schema";

import { PutItemOptions } from "./types/overrides";
import { BatchDeleteOutput, BatchPutOutput, BatchWriteOutput, PutItemResponse } from "./types/model/createdItem";
import { FilterSelect, GotItem } from "./types/model/gotItem";
import { SelectableFields } from "./types/schema/getFieldsStringLiteralPaths";
import { GetSortKeyExpression, WithConditions } from "./types/model/withConditions";
import { validate } from "./validators/validate";
import { cleanUnusedFields } from "./transformers/cleanUnusedFields";
import { applyGetTransformers } from "./transformers/applyGetTransformers";
import { QueryCommandInputOptions, QueryTypedOutput } from "./types/overrides/query";
import { GetCommandInputOptions } from "./types/overrides/getItem";
import {
  GetPrimaryKey,
  ExtractSecondarySchema,
  SecondaryQueryConditions,
  GetPartitionKey,
  GetSortKey,
  ExtractGlob,
  RequireSecondaryIndices,
  ExtractSchemaFromNativeSelect,
  GetSelectValue,
  GetPartitionKeyNativeType,
} from "./types/utils";
import {
  TransactGetOptions,
  TransactGetOutput,
  TransactGetKeySelectInput,
  TransactPutOptions,
  TransactWriteInputOptions,
  TransactDeleteOptions,
  TransactWriteInput,
  TransactUpdateOptions,
} from "./types/overrides/transact";
import { ScanCommandInputOptions, ScanTypedOutput } from "./types/overrides/scan";
import { BatchGetOptions, BatchGetTypedOutput, BatchWriteOptions } from "./types/overrides/batch";
import { CreateTableOptions, UpdateTableOptions, TableBasicOptions, CreateTableTypedOutput } from "./types/overrides/table";
import { UpdateItemOptions, UpdateCommandTypedOutput } from "./types/overrides/update";
import { DeleteItemOptions } from "./types/overrides/delete";
import { DynamoQLException } from "./errors/base";
import { StoredItem } from "./types/model/storedItem";
import { applySchemaDefinedTypes } from "./transformers/applySchemaDefinedTypes";

const selectOptions = { COUNT: "COUNT", ALL: "ALL_ATTRIBUTES", PROJECTED: "ALL_PROJECTED_ATTRIBUTES" };

export class Model<TableName extends string, B, C> {
  #name: TableName;
  /**
   * @internal
   * @deprecated
   */
  readonly Schema: Schema<B>;
  /**
   * @internal
   * @deprecated
   */
  schema: B;

  readonly client: DynamoDBClient;

  static #marshallOptions: marshallOptions = {
    removeUndefinedValues: true,
    convertTopLevelContainer: true,
    convertClassInstanceToMap: true,
  };
  static #unmarshallOptions: unmarshallOptions = {
    convertWithoutMapWrapper: false,
  };
  table: {
    name: TableName;
    create<Options extends CreateTableOptions>(options?: Options): CreateTableTypedOutput<Options>;
    update<Options extends UpdateTableOptions>(options?: Options): Options extends { exec: false } ? UpdateTableCommandInput : Promise<UpdateTableCommandOutput>;
    delete<Options extends TableBasicOptions>(options?: Options): Options extends { exec: false } ? DeleteTableCommandInput : Promise<DeleteTableCommandOutput>;
    describe<Options extends TableBasicOptions>(options?: Options): Options extends { exec: false } ? DescribeTableCommandInput : Promise<DescribeTableCommandOutput>;
  } = {
    name: "" as TableName,
    create: async (options?) => {
      const { _options, dontExec } = Model.#getOptions(options);
      const createTableInput: CreateTableCommandInput = {
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,
          WriteCapacityUnits: 1,
        },
        ..._options,
        TableName: this.#name,
        AttributeDefinitions: this.Schema.AttributeDefinitions,
        KeySchema: this.Schema.KeySchema,
      };

      if (this.Schema.LocalSecondaryIndexes.length) {
        createTableInput.LocalSecondaryIndexes = this.Schema.LocalSecondaryIndexes;
      }

      if (this.Schema.GlobalSecondaryIndexes.length) {
        createTableInput.GlobalSecondaryIndexes = this.Schema.GlobalSecondaryIndexes.map((x) => {
          x.ProvisionedThroughput = createTableInput.ProvisionedThroughput;
          return x;
        });
      }

      if (dontExec) {
        return createTableInput as any;
      }
      const createTableCmd = new CreateTableCommand(createTableInput);

      return await this.client.send(createTableCmd);
    },
    update: (options?) => {
      const { _options, dontExec } = Model.#getOptions(options);
      const cmd: UpdateTableCommandInput = {
        ..._options,
        TableName: this.#name,
      };

      if (dontExec) {
        return cmd as any;
      }
      const f = this.client.send(new DeleteTableCommand(cmd));
      return this.client.send(new DeleteTableCommand(cmd));
    },
    delete: (options?) => {
      const { dontExec } = Model.#getOptions(options);
      const cmd: DeleteTableCommandInput = {
        TableName: this.#name,
      };

      if (dontExec) {
        return cmd as any;
      }

      return this.client.send(new DeleteTableCommand(cmd));
    },
    describe: (options?) => {
      const { dontExec } = Model.#getOptions(options);
      const cmd: DescribeTableCommandInput = {
        TableName: this.#name,
      };
      if (dontExec) {
        return cmd as any;
      }
      return this.client.send(new DescribeTableCommand(cmd));
    },
  };
  constructor(name: TableName, schema: Schema<B>, clientConfig: DynamoDBClientConfig) {
    this.#name = name;
    this.table.name = name;
    this.Schema = schema;
    this.client = new DynamoDBClient(clientConfig);
  }

  async #validate(item: any) {
    await validate(this.Schema, item, "", this.#name);
  }

  async query<Where, Options extends QueryCommandInputOptions<B>>(
    where: GetSortKey<B> extends never
      ? GetPrimaryKey<B, [GetPartitionKey<B>]> & WithConditions<{ fields: Omit<B, GetPartitionKey<B>> }>
      : GetPrimaryKey<B, [GetPartitionKey<B>]> & WithConditions<{ fields: Omit<B, GetPartitionKey<B> | GetSortKey<B>> }> & GetSortKeyExpression<B, GetSortKey<B>>,
    options?: Options
  ): Promise<QueryTypedOutput<Options, Options["Select"], Options["Select"] extends readonly string[] ? FilterSelect<GotItem<B>, Options["Select"]> : GotItem<B>>> {
    const cmd: QueryCommandInput = {
      TableName: this.#name,
    };

    const attribs = new ExpressionAttributes(Model.#marshallOptions);

    const keyExpr = {};
    const filterExpr = {};

    // @ts-ignore
    Object.entries(where).forEach(([key, value]) => {
      const field = this.Schema.fields[key];

      if (field) {
        const { primaryIndex, sortKey } = field;

        if (primaryIndex | sortKey) {
          keyExpr[key] = value;
        } else {
          filterExpr[key] = value;
        }
      } else {
        filterExpr[key] = value;
      }
    });

    const { _options, dontExec, getterInfo, select } = Model.#getOptions(options);

    if (Array.isArray(select) && select) {
      const projections: string[] = [];
      // @ts-ignore
      for (const s of select as string[]) {
        projections.push(attribs.addName(s));
      }
      cmd.ProjectionExpression = projections.join(", ");
    } else if (select == "COUNT") {
      cmd.Select = "COUNT";
    }

    if (Object.keys(keyExpr).length) {
      cmd.KeyConditionExpression = serializeConditionExpression(getConditionExpressions(this.Schema, keyExpr), attribs);
    }

    if (Object.keys(filterExpr).length) {
      cmd.FilterExpression = serializeConditionExpression(getConditionExpressions(this.Schema, filterExpr), attribs);
    }

    if (Object.keys(attribs.names).length) {
      cmd.ExpressionAttributeNames = attribs.names;
    }

    if (Object.keys(attribs.values).length) {
      cmd.ExpressionAttributeValues = attribs.values;
    }

    const _cmd = { ..._options, ...cmd };
    if (dontExec) {
      // @ts-ignore
      return _cmd;
    }

    // @ts-ignore
    const res = await this.client.send(new QueryCommand(_cmd));
    if (res.Items) {
      const Items = res.Items.map((x) => unmarshall(x, Model.#unmarshallOptions));

      for (let i = 0; i < Items.length; i++) {
        const Item = Items[i];

        Items[i] = await applyGetTransformers(this.Schema, Item, Item, getterInfo);
      }

      res.Items = Items;
    }
    // @ts-ignore
    return res;
  }

  async #scan(where: any, options: any, indexName?: string | undefined) {
    const { _options, dontExec, getterInfo, select } = Model.#getOptions(options);

    const cmd: ScanCommandInput = { TableName: this.#name };

    if (indexName) {
      cmd.IndexName = indexName;
    }
    const attribs = new ExpressionAttributes(Model.#marshallOptions);

    const filter = serializeConditionExpression(getConditionExpressions(this.Schema, where), attribs);
    if (filter) {
      cmd.FilterExpression = filter;
    }

    if (Array.isArray(select) && select.length) {
      const projections: string[] = [];
      // @ts-ignore
      for (const s of select as string[]) {
        projections.push(attribs.addName(s));
      }
      cmd.ProjectionExpression = projections.join(", ");
    } else if (typeof select == "string") {
      cmd.Select = selectOptions[select];
    }

    if (Object.keys(attribs.names).length) {
      cmd.ExpressionAttributeNames = attribs.names;
    }

    if (Object.keys(attribs.values).length) {
      cmd.ExpressionAttributeValues = attribs.values;
    }

    const input = { ..._options, ...cmd };

    if (dontExec) {
      return input;
    }

    const res = await this.client.send(new ScanCommand(input));
    if (res.Items) {
      const Items = res.Items.map((x) => unmarshall(x, Model.#unmarshallOptions));

      for (let i = 0; i < Items.length; i++) {
        const Item = Items[i];

        Items[i] = await applyGetTransformers(this.Schema, Item, Item, getterInfo);
      }

      res.Items = Items;
    }
    return res;
  }
  async scan<Where, Options extends ScanCommandInputOptions<B>>(
    where: WithConditions<{ fields: B }> = {},
    options?: Options
  ): Promise<ScanTypedOutput<Options, Options["Select"], Options["Select"] extends readonly string[] ? FilterSelect<GotItem<B>, Options["Select"]> : GotItem<B>>> {
    // @ts-ignore
    const res = await this.#scan(where, options);
    // @ts-ignore
    return res;
  }
  async validate(item: any, setterInfo: any): Promise<any> {
    // @ts-ignore
    let preparingDoc = await setDefaultFields(this.Schema, item);

    // @ts-ignore
    preparingDoc = await applyStringTransformers(this.Schema, preparingDoc);
    // @ts-ignore
    preparingDoc = await applyCustomSetters(this.Schema, preparingDoc, item, setterInfo);

    await this.#validate(preparingDoc);

    cleanUnusedFields(this.Schema, preparingDoc);

    return preparingDoc;
  }

  async put<Item extends PutItem<B>, Conditions, Options extends PutItemOptions>(
    item: Item,
    conditions?: WithConditions<{ fields: B }>,
    options?: Options
  ): PutItemResponse<B, Options, Item, StoredItem<B>> {
    const { _options, dontExec, setterInfo } = Model.#getOptions(options);

    const putItem = await this.validate(item, setterInfo);
    const putCmdParams: PutItemCommandInput = {
      ..._options,
      TableName: this.#name,
      // @ts-ignore
      Item: marshall(putItem, Model.#marshallOptions).M,
    };

    if (isJsObject(conditions)) {
      const attribs = new ExpressionAttributes(Model.#marshallOptions);
      const ConditionExpression = serializeConditionExpression(getConditionExpressions(this.Schema, conditions as Record<string, any>), attribs);

      if (ConditionExpression) {
        putCmdParams.ConditionExpression = ConditionExpression;
      }

      if (Object.keys(attribs.names).length) {
        putCmdParams.ExpressionAttributeNames = attribs.names;
      }

      if (Object.keys(attribs.values).length) {
        putCmdParams.ExpressionAttributeValues = attribs.values;
      }
    }

    if (dontExec) {
      // @ts-ignore
      return putCmdParams;
    }

    const putCmd = new PutItemCommand(putCmdParams);

    const createdItemResponse: PutItemCommandOutput = await this.client.send(putCmd);

    // @ts-ignore
    createdItemResponse.Item = putItem;

    if (createdItemResponse.Attributes) {
      createdItemResponse.Attributes = applySchemaDefinedTypes(this.Schema, unmarshall(createdItemResponse.Attributes, Model.#unmarshallOptions));
    }

    // @ts-ignore
    return createdItemResponse;
  }

  static #getOptions(options: any) {
    let _options: any = {};
    if (options) {
      _options = { ...options };
    }

    const dontExec = _options.exec === false;
    delete _options.exec;
    const select = _options.Select;
    delete _options.Select;
    const getterInfo = _options.getterInfo;
    delete _options.getterInfo;
    const setterInfo = _options.setterInfo;
    delete _options.setterInfo;

    return { _options, dontExec, select, getterInfo, setterInfo };
  }

  async get<Pk>(
    pk: GetSortKey<B> extends never ? GetPartitionKeyNativeType<B> | this["Schema"]["primaryKey"] : this["Schema"]["primaryKey"]
  ): Promise<Omit<GetItemCommandOutput, "Item"> & { Item?: GotItem<B> }>;
  // @ts-ignore
  async get<Pk, Options extends GetCommandInputOptions<SelectableFields<B>>>(
    pk: GetSortKey<B> extends never ? GetPartitionKeyNativeType<B> | this["Schema"]["primaryKey"] : this["Schema"]["primaryKey"],
    options: Options
  ): Promise<
    Options extends { exec: false }
      ? GetItemCommandInput
      : "Select" extends keyof Options
      ? Options["Select"] extends readonly `${string}${"#"}${string}`[]
        ? never
        : Omit<GetItemCommandOutput, "Item"> & {
            Item?: Options["Select"] extends readonly string[] ? FilterSelect<GotItem<B>, Options["Select"]> : GotItem<B>;
          }
      : Omit<GetItemCommandOutput, "Item"> & { Item?: GotItem<B> }
  >;

  async get<Pk, Options extends GetCommandInputOptions<SelectableFields<B>> | never>(
    pk: GetSortKey<B> extends never ? GetPartitionKeyNativeType<B> | this["Schema"]["primaryKey"] : this["Schema"]["primaryKey"],
    options?: Options
  ): Promise<
    (Omit<GetItemCommandOutput, "Item"> & { Item?: GotItem<B> }) | Options extends { exec: false }
      ? GetItemCommandInput
      : "Select" extends keyof Options
      ? Options["Select"] extends readonly `${string}${"#"}${string}`[]
        ? never
        : Omit<GetItemCommandOutput, "Item"> & {
            Item?: Options["Select"] extends readonly string[] ? FilterSelect<GotItem<B>, Options["Select"]> : GotItem<B>;
          }
      : Omit<GetItemCommandOutput, "Item"> & { Item?: GotItem<B> }
  > {
    const cmd: GetItemCommandInput = {
      TableName: this.#name,
      Key: this.Schema.marshallPk(pk),
    };

    const { _options, dontExec, select, getterInfo } = Model.#getOptions(options);

    if (Array.isArray(select) && select.length) {
      const attribs = new ExpressionAttributes(Model.#marshallOptions);
      const projections: string[] = [];
      for (const s of select as string[]) {
        projections.push(attribs.addName(s));
      }

      cmd.ProjectionExpression = projections.join(", ");

      if (Object.keys(attribs.names).length) {
        cmd.ExpressionAttributeNames = attribs.names;
      }
    }

    const _cmd = { ..._options, ...cmd };
    if (dontExec) {
      return _cmd;
    }
    const res = await this.client.send(new GetItemCommand(_cmd));

    if (res.Item) {
      const unmarshalled = unmarshall(res.Item, Model.#unmarshallOptions);

      // @ts-ignore
      res.Item = await applyGetTransformers(this.Schema, unmarshalled, unmarshalled, getterInfo);
    }
    // @ts-ignore
    return res;
  }
  async delete<Condition, Options extends DeleteItemOptions>(
    where: GetPrimaryKey<B, [GetPartitionKey<B>, GetSortKey<B>]> & WithConditions<{ fields: Omit<B, GetPartitionKey<B> | GetSortKey<B>> }>,
    options?: Options
  ): Promise<
    Options extends { exec: false }
      ? DeleteItemCommandInput
      : Options extends { ReturnValues: "ALL_OLD" }
      ? Omit<DeleteItemCommandOutput, "Attributes"> & { Attributes: StoredItem<B> }
      : Omit<DeleteItemCommandOutput, "Attributes">
  > {
    const attribs = new ExpressionAttributes(Model.#marshallOptions);

    const keyExpr = {};
    const filterExpr = {};

    // @ts-ignore
    Object.entries(where).forEach(([key, value]) => {
      const field = this.Schema.fields[key];
      if (field) {
        const { primaryIndex, sortKey } = field;

        if (primaryIndex || sortKey) {
          keyExpr[key] = value;
        } else {
          filterExpr[key] = value;
        }
      } else {
        filterExpr[key] = value;
      }
    });

    const cmd: DeleteItemCommandInput = {
      TableName: this.#name,
      Key: this.Schema.marshallPk(keyExpr),
    };
    const ConditionExpression = serializeConditionExpression(getConditionExpressions(this.Schema, filterExpr), attribs);
    if (ConditionExpression) {
      cmd.ConditionExpression = ConditionExpression;
    }
    if (Object.keys(attribs.names).length) {
      cmd.ExpressionAttributeNames = attribs.names;
    }

    if (Object.keys(attribs.values).length) {
      cmd.ExpressionAttributeValues = attribs.values;
    }
    const { _options, dontExec } = Model.#getOptions(options);

    const _cmd = { ..._options, ...cmd };

    if (dontExec) {
      // @ts-ignore
      return _cmd;
    }

    const res = await this.client.send(new DeleteItemCommand(_cmd));

    if (res.Attributes) {
      res.Attributes = applySchemaDefinedTypes(this.Schema, unmarshall(res.Attributes, Model.#unmarshallOptions));
    }

    // @ts-ignore
    return res;
  }

  // @ts-ignore
  async update<Where, Set>(
    where: GetPrimaryKey<B, [GetPartitionKey<B>, GetSortKey<B>]> & WithConditions<{ fields: Omit<B, GetPartitionKey<B> | GetSortKey<B>> }>,
    set: updateExpr<B>
  ): Promise<Omit<UpdateItemCommandOutput, "Attributes">>;

  async update<Where, Set, Options extends UpdateItemOptions>(
    where: GetPrimaryKey<B, [GetPartitionKey<B>, GetSortKey<B>]> & WithConditions<{ fields: Omit<B, GetPartitionKey<B> | GetSortKey<B>> }>,
    set: updateExpr<B>,
    options?: Options
  ): Promise<UpdateCommandTypedOutput<Options, StoredItem<B>>>;
  async update<Where, Set, Options extends UpdateItemOptions | never>(
    where: GetPrimaryKey<B, [GetPartitionKey<B>, GetSortKey<B>]> & WithConditions<{ fields: Omit<B, GetPartitionKey<B> | GetSortKey<B>> }>,
    set: updateExpr<B>,
    options: Options
  ): Promise<Omit<UpdateItemCommandOutput, "Attributes"> | UpdateCommandTypedOutput<Options, StoredItem<B>>> {
    const cleanedExpressions = await getUpdateExpressions(this.#name, set, this.Schema);

    const attribs = new ExpressionAttributes(Model.#marshallOptions);
    const queryString = cleanedExpressions.serialize(attribs);

    const keyExpr = {};
    const filterExpr = {};

    // @ts-ignore
    Object.entries(where).forEach(([key, value]) => {
      const field = this.Schema.fields[key];
      if (field) {
        const { primaryIndex, sortKey } = field;

        if (primaryIndex || sortKey) {
          keyExpr[key] = value;
        } else {
          filterExpr[key] = value;
        }
      } else {
        filterExpr[key] = value;
      }
    });

    const ConditionExpression = serializeConditionExpression(getConditionExpressions(this.Schema, filterExpr), attribs);

    const { _options, dontExec } = Model.#getOptions(options);

    const updateCmd: UpdateItemCommandInput = {
      ..._options,
      TableName: this.#name,
      Key: this.Schema.marshallPk(keyExpr),
      UpdateExpression: queryString,
    };
    if (ConditionExpression) {
      updateCmd.ConditionExpression = ConditionExpression;
    }

    if (Object.keys(attribs.names).length) {
      updateCmd.ExpressionAttributeNames = attribs.names;
    }

    if (Object.keys(attribs.values).length) {
      updateCmd.ExpressionAttributeValues = attribs.values;
    }

    if (dontExec) {
      // @ts-ignore
      return updateCmd;
    }

    const res = await this.client.send(new UpdateItemCommand(updateCmd));

    if (res.Attributes) {
      res.Attributes = applySchemaDefinedTypes(this.Schema, unmarshall(res.Attributes, Model.#unmarshallOptions));
    }
    // @ts-ignore
    return res;
  }
  using<IndexName extends this["Schema"]["indexNames"]>(indexName: IndexName) {
    if (typeof indexName != "string") {
      throw new DynamoQLException("Invalid IndexName");
    }
    const client = this.client;
    const TableName = this.#name;
    const Schema = this.Schema;
    const scan = this.#scan.bind(this);

    return {
      async query<Where, Options extends QueryCommandInputOptions<B, IndexName>>(
        where: SecondaryQueryConditions<B, IndexName>,
        options?: Options
      ): Promise<
        QueryTypedOutput<
          Options,
          GetSelectValue<Options>,
          GetSelectValue<Options> extends readonly string[]
            ? FilterSelect<
                RequireSecondaryIndices<B, GotItem<ExtractGlob<B, IndexName> extends never ? B : ExtractSecondarySchema<B, IndexName>>, IndexName>,
                GetSelectValue<Options>
              >
            : RequireSecondaryIndices<
                B,
                GotItem<GetSelectValue<Options> extends undefined | never | "ALL" | "PROJECTED" ? ExtractSchemaFromNativeSelect<B, IndexName, GetSelectValue<Options>> : B>,
                IndexName
              >
        >
      > {
        const cmd: QueryCommandInput = {
          TableName,
          IndexName: indexName,
        };
        const attribs = new ExpressionAttributes(Model.#marshallOptions);
        const keyExpr = {};
        const filterExpr = {};
        const isSecondaryIndex = Object.values(Schema.fields).find((v: any) => v.LSI?.indexName == indexName);

        const { _options, dontExec, getterInfo, select } = Model.#getOptions(options);

        if (Array.isArray(select) && select.length) {
          const projections: string[] = [];
          // @ts-ignore
          for (const s of select as string[]) {
            projections.push(attribs.addName(s));
          }
          cmd.ProjectionExpression = projections.join(", ");
        } else if (select) {
          cmd.Select = selectOptions[select];
        }

        // @ts-ignore
        Object.entries(where).forEach(([key, value]) => {
          const field = Schema.fields[key];
          if (field) {
            const { primaryIndex, GSI, LSI } = field;

            if (GSI || LSI) {
              if (indexName == GSI?.indexName) {
                keyExpr[key] = value;
              } else if (indexName == LSI?.indexName) {
                keyExpr[key] = value;
              } else {
                filterExpr[key] = value;
              }
            } else if (primaryIndex && isSecondaryIndex) {
              keyExpr[key] = value;
            } else {
              filterExpr[key] = value;
            }
          } else {
            filterExpr[key] = value;
          }
        });

        if (Object.keys(keyExpr).length) {
          cmd.KeyConditionExpression = serializeConditionExpression(getConditionExpressions(Schema, keyExpr), attribs);
        }

        if (Object.keys(filterExpr).length) {
          cmd.FilterExpression = serializeConditionExpression(getConditionExpressions(Schema, filterExpr), attribs);
        }

        if (Object.keys(attribs.names).length) {
          cmd.ExpressionAttributeNames = attribs.names;
        }

        if (Object.keys(attribs.values).length) {
          cmd.ExpressionAttributeValues = attribs.values;
        }

        const _cmd = { ..._options, ...cmd };

        if (dontExec) {
          // @ts-ignore
          return cmd;
        }

        const res = await client.send(new QueryCommand(_cmd));
        if (res.Items) {
          const Items = res.Items.map((x) => unmarshall(x, Model.#unmarshallOptions));

          for (let i = 0; i < Items.length; i++) {
            const Item = Items[i];

            Items[i] = await applyGetTransformers(Schema, Item, Item, getterInfo);
          }

          res.Items = Items;
        }
        // @ts-ignore
        return res;
      },
      async scan<Where, Options extends ScanCommandInputOptions<B, IndexName>>(
        where: WithConditions<{ fields: B }> = {},
        options?: Options
      ): Promise<
        ScanTypedOutput<
          Options,
          GetSelectValue<Options>,
          GetSelectValue<Options> extends readonly string[]
            ? FilterSelect<
                RequireSecondaryIndices<B, GotItem<ExtractGlob<B, IndexName> extends never ? B : ExtractSecondarySchema<B, IndexName>>, IndexName>,
                GetSelectValue<Options>
              >
            : RequireSecondaryIndices<
                B,
                GotItem<GetSelectValue<Options> extends undefined | never | "ALL" | "PROJECTED" ? ExtractSchemaFromNativeSelect<B, IndexName, GetSelectValue<Options>> : B>,
                IndexName
              >
        >
      > {
        // @ts-ignore
        return scan(where, options, indexName);
      },
    };
  }

  async batchGet<Items>(
    items: GetSortKey<B> extends never ? GetPartitionKeyNativeType<B>[] | this["Schema"]["primaryKey"][] : this["Schema"]["primaryKey"][]
  ): Promise<BatchGetTypedOutput<GotItem<B>, TableName, this["Schema"]["primaryKey"]>>;

  async batchGet<Items, Options extends BatchGetOptions<SelectableFields<B>>>(
    items: GetSortKey<B> extends never ? GetPartitionKeyNativeType<B>[] | this["Schema"]["primaryKey"][] : this["Schema"]["primaryKey"][],
    options: Options
  ): Promise<
    Options extends { exec: false }
      ? BatchGetItemCommandInput
      : BatchGetTypedOutput<Options["Select"] extends readonly string[] ? FilterSelect<GotItem<B>, Options["Select"]> : GotItem<B>, TableName, this["Schema"]["primaryKey"]>
  >;
  async batchGet<Items, Options extends BatchGetOptions<SelectableFields<B>> | never>(
    items: GetSortKey<B> extends never ? GetPartitionKeyNativeType<B>[] | this["Schema"]["primaryKey"][] : this["Schema"]["primaryKey"][],
    options?: Options
  ): Promise<
    BatchGetTypedOutput<GotItem<B>, TableName, this["Schema"]["primaryKey"]> | Options extends { exec: false }
      ? BatchGetItemCommandInput
      : BatchGetTypedOutput<Options["Select"] extends readonly string[] ? FilterSelect<GotItem<B>, Options["Select"]> : GotItem<B>, TableName, this["Schema"]["primaryKey"]>
  > {
    if (!items.length) {
      throw new DynamoQLException(`${this.#name} > batchGet must include at least one item.`);
    }
    const attribs = new ExpressionAttributes(Model.#marshallOptions);

    let ExpressionAttributeNames: Record<string, any> | undefined = undefined;
    let ProjectionExpression: string | undefined = undefined;

    const { _options, dontExec, getterInfo, select } = Model.#getOptions(options);

    if (select) {
      const expressionNames: string[] = [];
      for (const keyPath of select) {
        expressionNames.push(attribs.addName(keyPath));
      }

      ProjectionExpression = expressionNames.join(",");
    }

    if (Object.keys(attribs.names).length) {
      ExpressionAttributeNames = attribs.names;
    }

    const cmd: BatchGetItemCommandInput = {
      // @ts-ignore
      RequestItems: {
        [this.#name]: {
          Keys: items.map((x) => this.Schema.marshallPk(x)),
        },
      },
    };

    if (ProjectionExpression) {
      cmd.RequestItems[this.#name].ProjectionExpression = ProjectionExpression;
    }

    if (ExpressionAttributeNames) {
      cmd.RequestItems[this.#name].ExpressionAttributeNames = ExpressionAttributeNames;
    }
    if (_options.ConsistentRead) {
      cmd.RequestItems[this.#name].ConsistentRead = _options.ConsistentRead;
    }

    if (_options.ReturnConsumedCapacity) {
      cmd.ReturnConsumedCapacity = _options.ReturnConsumedCapacity;
    }

    if (dontExec) {
      // @ts-ignore
      return cmd;
    }

    const res = await this.client.send(new BatchGetItemCommand(cmd));

    if (Array.isArray(res.Responses?.[this.#name])) {
      const Items = res.Responses[this.#name].map((x) => unmarshall(x, Model.#unmarshallOptions));

      for (let i = 0; i < Items.length; i++) {
        const Item = Items[i];

        Items[i] = await applyGetTransformers(this.Schema, Item, Item, getterInfo);
      }
      // @ts-ignore
      res.Items = Items;
      // `delete res.Responses` will slow down the runtime so we leaving it as it is
    }

    if (Array.isArray(res.UnprocessedKeys[this.#name]?.Keys)) {
      for (let i = 0; i < res.UnprocessedKeys[this.#name].Keys.length; i++) {
        res.UnprocessedKeys[this.#name].Keys[i] = unmarshall(res.UnprocessedKeys[this.#name].Keys[i], Model.#unmarshallOptions);
        delete res.UnprocessedKeys[this.#name].ProjectionExpression;
        delete res.UnprocessedKeys[this.#name].ExpressionAttributeNames;
      }
    }
    // @ts-ignore
    return res;
  }
  async batchPut<Items extends this["Schema"]["PutItem"][], Options extends BatchWriteOptions>(
    items: Items,
    options?: Options
  ): BatchPutOutput<Options, B, (typeof items)[number], TableName> {
    if (!items.length) {
      throw new DynamoQLException(`${this.#name} > batchPut must include at least one item.`);
    }
    const { _options, dontExec, setterInfo } = Model.#getOptions(options);

    const createdItems = [];
    const Items = await Promise.all(
      items.map(async (item) => {
        const creatingItem = await this.validate(item, setterInfo);
        createdItems.push(creatingItem);
        return {
          PutRequest: {
            Item: marshall(creatingItem, Model.#marshallOptions).M,
          },
        };
      })
    );

    const cmd: BatchWriteItemCommandInput = {
      // @ts-ignore
      RequestItems: {
        [this.#name]: Items,
      },
    };

    if (_options.ReturnConsumedCapacity) {
      cmd.ReturnConsumedCapacity = _options.ReturnConsumedCapacity;
    }
    if (_options.ReturnItemCollectionMetrics) {
      cmd.ReturnItemCollectionMetrics = _options.ReturnItemCollectionMetrics;
    }

    if (dontExec) {
      // @ts-ignore
      return cmd;
    }

    const res = await this.client.send(new BatchWriteItemCommand(cmd));

    // @ts-ignore
    res.Items = createdItems;

    if (Array.isArray(res.UnprocessedItems[this.#name])) {
      for (let i = 0; i < res.UnprocessedItems[this.#name].length; i++) {
        res.UnprocessedItems[this.#name][i].PutRequest.Item = unmarshall(res.UnprocessedItems[this.#name][i].PutRequest.Item, Model.#unmarshallOptions);
      }
    }
    // @ts-ignore
    return res;
  }
  async batchDelete<Items, Options extends Omit<BatchWriteOptions, "setterInfo">>(
    items: GetSortKey<B> extends never ? GetPartitionKeyNativeType<B>[] | this["Schema"]["primaryKey"][] : this["Schema"]["primaryKey"][],
    options?: Options
  ): BatchDeleteOutput<Options, this["Schema"]["primaryKey"], TableName> {
    if (!items.length) {
      throw new DynamoQLException(`${this.#name} > batchDelete must include at least one item.`);
    }
    const { _options, dontExec } = Model.#getOptions(options);

    const cmd: BatchWriteItemCommandInput = {
      RequestItems: {
        [this.#name]: items.map((x) => {
          return {
            DeleteRequest: {
              Key: this.Schema.marshallPk(x),
            },
          };
        }),
      },
    };

    if (_options.ReturnConsumedCapacity) {
      cmd.ReturnConsumedCapacity = _options.ReturnConsumedCapacity;
    }
    if (_options.ReturnItemCollectionMetrics) {
      cmd.ReturnItemCollectionMetrics = _options.ReturnItemCollectionMetrics;
    }

    if (dontExec) {
      // @ts-ignore
      return cmd;
    }

    const res = await this.client.send(new BatchWriteItemCommand(cmd));

    if (Array.isArray(res.UnprocessedItems[this.#name])) {
      for (let i = 0; i < res.UnprocessedItems[this.#name].length; i++) {
        res.UnprocessedItems[this.#name][i].DeleteRequest.Key = unmarshall(res.UnprocessedItems[this.#name][i].DeleteRequest.Key, Model.#unmarshallOptions);
      }
    }

    // @ts-ignore
    return res;
  }

  async batchWrite<WriteRequester extends this, Options extends BatchWriteOptions>(
    items: {
      put?: WriteRequester["Schema"]["PutItem"][];
      delete?: GetSortKey<B> extends never ? GetPartitionKeyNativeType<B>[] | WriteRequester["Schema"]["primaryKey"][] : WriteRequester["Schema"]["primaryKey"][];
    },
    options?: Options
  ): BatchWriteOutput<Options, B, this["Schema"]["primaryKey"], (typeof items)["put"][number], TableName> {
    const { _options, dontExec, setterInfo } = Model.#getOptions(options);

    const cmd: BatchWriteItemCommandInput = {
      RequestItems: {
        [this.#name]: [],
      },
    };

    if (_options.ReturnConsumedCapacity) {
      cmd.ReturnConsumedCapacity = _options.ReturnConsumedCapacity;
    }
    if (_options.ReturnItemCollectionMetrics) {
      cmd.ReturnItemCollectionMetrics = _options.ReturnItemCollectionMetrics;
    }

    const Items = [];
    // @ts-ignore
    if (Array.isArray(items.put)) {
      const putRequests = await Promise.all(
        items.put.map(async (item) => {
          const creatingItem = await this.validate(item, setterInfo);
          Items.push(creatingItem);
          return {
            PutRequest: {
              Item: marshall(creatingItem, Model.#marshallOptions).M,
            },
          };
        })
      );

      // @ts-ignore
      cmd.RequestItems[this.#name].push(...putRequests);
    }

    if (Array.isArray(items.delete)) {
      for (const item of items.delete) {
        cmd.RequestItems[this.#name].push({
          DeleteRequest: {
            Key: this.Schema.marshallPk(item),
          },
        });
      }
    }

    if (dontExec) {
      // @ts-ignore
      return cmd;
    }

    const res = await this.client.send(new BatchWriteItemCommand(cmd));

    if (Array.isArray(res.UnprocessedItems[this.#name])) {
      for (let i = 0; i < res.UnprocessedItems[this.#name].length; i++) {
        if (res.UnprocessedItems[this.#name][i].DeleteRequest) {
          res.UnprocessedItems[this.#name][i].DeleteRequest.Key = unmarshall(res.UnprocessedItems[this.#name][i].DeleteRequest.Key, Model.#unmarshallOptions);
        } else if (res.UnprocessedItems[this.#name][i].PutRequest) {
          res.UnprocessedItems[this.#name][i].PutRequest.Item = unmarshall(res.UnprocessedItems[this.#name][i].PutRequest.Item, Model.#unmarshallOptions);
        }
      }
    }

    // @ts-ignore
    res.Items = Items;
    // @ts-ignore
    return res;
  }

  async transactGet<Items>(
    items: GetSortKey<B> extends never ? GetPartitionKeyNativeType<B>[] | this["Schema"]["primaryKey"][] : this["Schema"]["primaryKey"][]
  ): Promise<TransactGetOutput<{ exec: true }, GotItem<B>>>;

  async transactGet<Items, Options extends TransactGetOptions<SelectableFields<B>>>(
    items: GetSortKey<B> extends never ? GetPartitionKeyNativeType<B>[] | this["Schema"]["primaryKey"][] : this["Schema"]["primaryKey"][],
    options?: Options
  ): Promise<TransactGetOutput<Options, Options["Select"] extends readonly string[] ? FilterSelect<GotItem<B>, Options["Select"]> : GotItem<B>>>;

  async transactGet<Items extends TransactGetKeySelectInput<this["Schema"]["primaryKey"], SelectableFields<B>>[], Options extends Omit<TransactGetOptions<never>, "Select">>(
    items: Items,
    options?: Options
  ): Promise<TransactGetOutput<Options, Items[number]["$select"] extends readonly string[] ? Partial<FilterSelect<GotItem<B>, Items[number]["$select"]>> : GotItem<B>>>;
  async transactGet<
    Items extends GetSortKey<B> extends never
      ? GetPartitionKeyNativeType<B>[] | this["Schema"]["primaryKey"][]
      : this["Schema"]["primaryKey"][] | TransactGetKeySelectInput<this["Schema"]["primaryKey"], SelectableFields<B>>[],
    Options extends TransactGetOptions<SelectableFields<B>>
  >(items: Items, options?: Options) {
    const attribs = new ExpressionAttributes(Model.#marshallOptions);

    let ExpressionAttributeNames: Record<string, any> | undefined = undefined;
    let ProjectionExpression: string | undefined = undefined;

    const { _options, dontExec, select, getterInfo } = Model.#getOptions(options);

    if (select?.length) {
      const expressionNames: string[] = [];
      for (const keyPath of select) {
        expressionNames.push(attribs.addName(keyPath));
      }

      ProjectionExpression = expressionNames.join(",");
    }

    if (Object.keys(attribs.names).length) {
      ExpressionAttributeNames = attribs.names;
    }

    const TransactItems: TransactGetItemsCommandInput["TransactItems"] = items.map((x) => {
      const isObject = isJsObject(x);
      const Item: TransactGetItemsCommandInput["TransactItems"][number]["Get"] = { TableName: this.#name, Key: this.Schema.marshallPk(isObject && x.$key ? x.$key : x) };

      if (isObject && Array.isArray(x.$select) && x.$select.length) {
        const attribs = new ExpressionAttributes(Model.#marshallOptions);

        const expressionNames: string[] = [];
        for (const keyPath of x.$select) {
          expressionNames.push(attribs.addName(keyPath));
        }

        Item.ProjectionExpression = expressionNames.join(",");
        Item.ExpressionAttributeNames = attribs.names;
      } else if (!x?.$key) {
        if (ExpressionAttributeNames) {
          Item.ExpressionAttributeNames = ExpressionAttributeNames;
        }

        if (ProjectionExpression) {
          Item.ProjectionExpression = ProjectionExpression;
        }
      }

      return {
        Get: Item,
      };
    });

    const cmd: TransactGetItemsCommandInput = {
      TransactItems,
    };

    const _cmd = { ..._options, ...cmd };

    if (dontExec) {
      // @ts-ignore
      return _cmd;
    }

    const res = await this.client.send(new TransactGetItemsCommand(_cmd));
    const Items = [];
    if (Array.isArray(res.Responses)) {
      for (let i = 0; i < res.Responses.length; i++) {
        const element = res.Responses[i];
        if (!element.Item) {
          continue;
        }

        let Item = unmarshall(element.Item, Model.#unmarshallOptions);
        Item = await applyGetTransformers(this.Schema, Item, Item, getterInfo);
        Items.push(Item);
      }
    }
    // @ts-ignore
    res.Items = Items;
    // @ts-ignore
    return res;
  }

  async #buildConditionCheckRequest({
    condition,
    ReturnValuesOnConditionCheckFailure,
  }: {
    condition: Record<string, any>;
    ReturnValuesOnConditionCheckFailure?: "NONE" | "ALL_OLD";
  }) {
    const o: any = { exec: false };
    if (ReturnValuesOnConditionCheckFailure) {
      o.ReturnValuesOnConditionCheckFailure = ReturnValuesOnConditionCheckFailure;
    }
    // @ts-ignore
    const input = await this.update(condition, {}, o);
    // @ts-ignore
    delete input.UpdateExpression;

    return input;
  }

  async transactPut<Items, Options extends TransactPutOptions<B>>(
    items: { item: PutItem<B>; condition?: WithConditions<{ fields: B }>; ReturnValuesOnConditionCheckFailure?: "NONE" | "ALL_OLD" }[],
    options?: Options
  ): Promise<Options extends { exec: false } ? TransactWriteItemsCommandInput : TransactWriteItemsCommandOutput> {
    const { _options, dontExec, setterInfo } = Model.#getOptions(options);

    const checks = _options.check;
    delete _options.check;

    const input: TransactWriteItemsCommandInput = {
      TransactItems: [],
    };

    if (Array.isArray(checks)) {
      for (const check of checks) {
        const ConditionCheck = await this.#buildConditionCheckRequest({ condition: check });
        // @ts-ignore
        input.TransactItems.push({ ConditionCheck });
      }
    }

    if (Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        const o: any = {
          exec: false,
          setterInfo,
        };

        if (item.ReturnValuesOnConditionCheckFailure) {
          o.ReturnValuesOnConditionCheckFailure = item.ReturnValuesOnConditionCheckFailure;
        }
        // @ts-ignore
        const p = await this.put(item.item, item.condition, o);
        // @ts-ignore
        input.TransactItems.push({ Put: p });
      }
    }

    const cmd = { ..._options, ...input };

    if (dontExec) {
      return cmd;
    }

    const res = await this.client.send(new TransactWriteItemsCommand(cmd));

    // @ts-ignore
    return res;
  }
  async transactUpdate<Items, Options extends TransactUpdateOptions<B>>(
    items: {
      condition: GetPrimaryKey<B, [GetPartitionKey<B>, GetSortKey<B>]> & WithConditions<{ fields: Omit<B, GetPartitionKey<B> | GetSortKey<B>> }>;
      set: updateExpr<B>;
      ReturnValuesOnConditionCheckFailure?: "NONE" | "ALL_OLD";
    }[],
    options?: Options
  ): Promise<Options extends { exec: false } ? TransactWriteItemsCommandInput : TransactWriteItemsCommandOutput> {
    const { _options, dontExec } = Model.#getOptions(options);

    const checks = _options.check;
    delete _options.check;

    const input: TransactWriteItemsCommandInput = {
      TransactItems: [],
    };

    if (Array.isArray(checks)) {
      for (const check of checks) {
        const ConditionCheck = await this.#buildConditionCheckRequest({ condition: check });
        // @ts-ignore
        input.TransactItems.push({ ConditionCheck });
      }
    }

    if (Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        const o: any = { exec: false };

        if (item.ReturnValuesOnConditionCheckFailure) {
          o.ReturnValuesOnConditionCheckFailure = item.ReturnValuesOnConditionCheckFailure;
        } // @ts-ignore
        const u = await this.update(item.condition, item.set, o);

        // @ts-ignore
        input.TransactItems.push({ Update: u });
      }
    }

    const cmd = { ..._options, ...input };

    if (dontExec) {
      return cmd;
    }

    const res = await this.client.send(new TransactWriteItemsCommand(cmd));

    // @ts-ignore
    return res;
  }
  async transactDelete<Items, Options extends TransactDeleteOptions<B>>(
    items: (GetPrimaryKey<B, [GetPartitionKey<B>, GetSortKey<B>]> & WithConditions<{ fields: Omit<B, GetPartitionKey<B> | GetSortKey<B>> }>)[],
    options?: Options
  ): Promise<Options extends { exec: false } ? TransactWriteItemsCommandInput : TransactWriteItemsCommandOutput> {
    let _options: any = {};
    if (options) {
      _options = { ...options };
    }

    const dontExec = _options.exec === false;
    delete _options.exec;
    const ReturnValuesOnConditionCheckFailure = _options.ReturnValuesOnConditionCheckFailure;
    delete _options.ReturnValuesOnConditionCheckFailure;

    const checks = _options.check;
    delete _options.check;

    const input: TransactWriteItemsCommandInput = {
      TransactItems: [],
    };

    if (Array.isArray(checks)) {
      for (const check of checks) {
        const ConditionCheck = await this.#buildConditionCheckRequest({ condition: check });
        // @ts-ignore
        input.TransactItems.push({ ConditionCheck });
      }
    }

    if (Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        const o: any = { exec: false };
        if (ReturnValuesOnConditionCheckFailure) {
          o.ReturnValuesOnConditionCheckFailure = ReturnValuesOnConditionCheckFailure;
        }
        // @ts-ignore
        const d = await this.delete(item, o);

        // @ts-ignore
        input.TransactItems.push({ Delete: d });
      }
    }

    const cmd = { ..._options, ...input };

    if (dontExec) {
      return cmd;
    }

    const res = await this.client.send(new TransactWriteItemsCommand(cmd));

    // @ts-ignore
    return res;
  }
  async transactWrite<Req, Options extends TransactWriteInputOptions>(
    req: TransactWriteInput<B>,
    options?: Options
  ): Promise<Options extends { exec: false } ? TransactWriteItemsCommandInput : TransactWriteItemsCommandOutput> {
    const { _options, dontExec } = Model.#getOptions(options);

    const input: TransactWriteItemsCommandInput = {
      TransactItems: [],
    };

    if (Array.isArray(req.check)) {
      for (let i = 0; i < req.check.length; i++) {
        const c = req.check[i];

        const ConditionCheck = await this.#buildConditionCheckRequest(c);
        // @ts-ignore
        input.TransactItems.push({ ConditionCheck });
      }
    }

    if (Array.isArray(req.put)) {
      for (let i = 0; i < req.put.length; i++) {
        const item = req.put[i];

        const o: any = {
          exec: false,
          setterInfo: item.setterInfo,
        };

        if (item.ReturnValuesOnConditionCheckFailure) {
          o.ReturnValuesOnConditionCheckFailure = item.ReturnValuesOnConditionCheckFailure;
        }
        // @ts-ignore
        const p = await this.put(item.item, item.condition, o);
        // @ts-ignore
        input.TransactItems.push({ Put: p });
      }
    }

    if (Array.isArray(req.delete)) {
      for (let i = 0; i < req.delete.length; i++) {
        const item = req.delete[i];

        const o: any = { exec: false };
        if (item.ReturnValuesOnConditionCheckFailure) {
          o.ReturnValuesOnConditionCheckFailure = item.ReturnValuesOnConditionCheckFailure;
        }
        // @ts-ignore
        const d = await this.delete(item.condition, o);
        // @ts-ignore
        input.TransactItems.push({ Delete: d });
      }
    }

    if (Array.isArray(req.update)) {
      for (let i = 0; i < req.update.length; i++) {
        const item = req.update[i];

        const o: any = { exec: false };

        if (item.ReturnValuesOnConditionCheckFailure) {
          o.ReturnValuesOnConditionCheckFailure = item.ReturnValuesOnConditionCheckFailure;
        } // @ts-ignore
        const u = await this.update(item.condition, item.set, o);

        // @ts-ignore
        input.TransactItems.push({ Update: u });
      }
    }

    const cmd = { ..._options, ...input };

    if (dontExec) {
      return cmd;
    }

    const res = await this.client.send(new TransactWriteItemsCommand(cmd));

    // @ts-ignore
    return res;
  }
}
