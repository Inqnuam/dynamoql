import type { SchemaConstructor, ExtractNativeType, PutItem, Mutable } from "./types/schema";
import type { AttributeDefinition, KeySchemaElement, LocalSecondaryIndex, GlobalSecondaryIndex, AttributeValue } from "@aws-sdk/client-dynamodb";
import { getDbType } from "./common/getDdbType";
import { isJsObject } from "./types/attributes/object";
import { GetPartitionKey, INDEXABLES, UnionToIntersection, isNotNestable } from "./types/utils";
import { pathToSchema } from "./common/pathToSchema";
import { AttributePath } from "./expressions";
import { marshall } from "@aws-sdk/util-dynamodb";
import { getDateTimestamp } from "./types/attributes/date";
import { DynamoQLException } from "./errors/base";
import { StoredItem } from "./types/model/storedItem";
import { GotItem } from "./types/model/gotItem";

const getProjection = (index: any) => {
  const Projection: LocalSecondaryIndex["Projection"] = {};
  if (Array.isArray(index.project)) {
    Projection.ProjectionType = "INCLUDE";
    Projection.NonKeyAttributes = index.project;
  } else if (index.project == "ALL") {
    Projection.ProjectionType = "ALL";
  } else if (index.project == "KEYS") {
    Projection.ProjectionType = "KEYS_ONLY";
  }
  return Projection;
};

type FieldType = Function | { type: Function | FieldType[] } | FieldType[];

export class Schema<T> {
  fields: any;
  primaryIndex: string = "";
  AttributeDefinitions: AttributeDefinition[] = [];
  KeySchema: KeySchemaElement[] = [];
  LocalSecondaryIndexes: LocalSecondaryIndex[] = [];
  GlobalSecondaryIndexes: GlobalSecondaryIndex[] = [];
  #usesDateType: boolean = false;
  /**
   * @description use only to infer Pk type of your Schema for type checking purpose
   * @deprecated Not deprecated! This is marked as deprecated to not use as JS value but only as Type
   */
  readonly primaryKey: UnionToIntersection<ExtractPrimaryKey<T>>;
  /**
   * @description Index names declared in Schema
   * @internal
   */
  readonly indexNames: ExtractIndexNames<T>;

  /**
   * @description use only to infer Item type of your Schema for type checking purpose
   * @deprecated Not deprecated! This is marked as deprecated to not use as JS value but only as Type
   */
  readonly PutItem: Mutable<PutItem<T>>;
  /**
   * @description use only to infer Item type of your Schema for type checking purpose
   * @deprecated Not deprecated! This is marked as deprecated to not use as JS value but only as Type
   */
  readonly StoredItem: Mutable<StoredItem<T>>;

  /**
   * @description use only to infer Item type of your Schema for type checking purpose
   * @deprecated Not deprecated! This is marked as deprecated to not use as JS value but only as Type
   */
  readonly GotItem: Mutable<GotItem<T>>;

  #parseSchemaField(field: FieldType) {
    const dbType = getDbType(field);

    let parsedField;

    if (typeof field == "function") {
      parsedField = {
        type: dbType,
        required: true,
      };

      if (dbType == "M") {
        parsedField.fields = {};
        parsedField.allowUndeclared = true;
      } else if (dbType == "N" && field.name == "BigInt") {
        parsedField.format = "bigint";
      }
    } else if (isJsObject(field)) {
      parsedField = {
        ...field,
        type: dbType,
      };
      // @ts-ignore
      if (dbType == "N" && field.type?.name == "BigInt") {
        parsedField.format = "bigint";
      } else if (parsedField.items) {
        // deep parse Array and Set
        parsedField.items = this.#parseSchemaField(parsedField.items);
      } else if (isJsObject(parsedField.fields)) {
        const childKeys = Object.keys(parsedField.fields);

        for (let i = 0; i < childKeys.length; i++) {
          const childFieldName = childKeys[i];
          parsedField.fields[childFieldName] = this.#parseSchemaField(parsedField.fields[childFieldName]);
        }
      }
    } else {
      parsedField = {
        type: dbType,
      };
    }

    if (parsedField.type == "M" && !isJsObject(parsedField.fields)) {
      parsedField.type = "ANY";
    }

    if (Array.isArray(parsedField.type)) {
      for (let i = 0; i < parsedField.type.length; i++) {
        const u = parsedField.type[i];

        if (isNotNestable(u.type)) {
          continue;
        }

        parsedField.type[i] = this.#parseSchemaField(u);
      }
    }

    if (parsedField.type == "L" && parsedField.items?.required) {
      parsedField.items.required = false;
    }

    return parsedField;
  }
  #parseSchema(schema: Record<string, any>) {
    Object.keys(schema).forEach((e) => {
      let key = schema[e] as any;

      key = this.#parseSchemaField(key);

      if (Array.isArray(key.type)) {
        schema[e] = key;
        return;
      }

      if (this.#isIndexableType(key.type)) {
        if (key.primaryIndex || key.LSI || key.GSI) {
          if (key.primaryIndex) {
            key.required = true;

            if (this.primaryIndex != "") {
              throw new DynamoQLException(`primaryIndex can not be used on field '${e}'. It is already set on field '${this.primaryIndex}'`);
            }

            this.primaryIndex = e;

            this.KeySchema.push({
              AttributeName: e,
              KeyType: "HASH",
            });
          }
          if (key.LSI) {
            this.LocalSecondaryIndexes.push({
              IndexName: key.LSI.indexName ?? e,
              KeySchema: [{ AttributeName: e, KeyType: "RANGE" }],
              Projection: getProjection(key.LSI),
            });
          }
          if (key.GSI) {
            const globalHashKey = this.GlobalSecondaryIndexes.findIndex((x) => x.IndexName == key.GSI.indexName);

            if (globalHashKey == -1) {
              const GSI: GlobalSecondaryIndex = {
                IndexName: key.GSI.indexName,
                KeySchema: [{ AttributeName: e, KeyType: key.GSI.sortKey ? "RANGE" : "HASH" }],
                Projection: {},
              };

              if (key.GSI.sortKey) {
                // in Schema GSI sortKey (RANGE) was defined before HASH key
                const foundGSIHash = Object.values(schema).find((x) => x.GSI?.indexName == key.GSI.indexName && !x.GSI.sortKey);

                if (foundGSIHash) {
                  GSI.Projection = getProjection(foundGSIHash.GSI);

                  if (foundGSIHash.GSI.capacity) {
                    GSI.ProvisionedThroughput = {
                      ReadCapacityUnits: foundGSIHash.GSI.capacity.read,
                      WriteCapacityUnits: foundGSIHash.GSI.capacity.write,
                    };
                  }
                }
              } else {
                GSI.Projection = getProjection(key.GSI);

                if (key.GSI.capacity) {
                  GSI.ProvisionedThroughput = {
                    ReadCapacityUnits: key.GSI.capacity.read,
                    WriteCapacityUnits: key.GSI.capacity.write,
                  };
                }
              }

              this.GlobalSecondaryIndexes.push(GSI);
            } else {
              if (key.GSI.sortKey) {
                this.GlobalSecondaryIndexes[globalHashKey].KeySchema.push({ AttributeName: e, KeyType: "RANGE" });
              } else {
                this.GlobalSecondaryIndexes[globalHashKey].KeySchema.unshift({ AttributeName: e, KeyType: "HASH" });
              }
            }
          }

          let t = key.type;

          if (t == "D") {
            t = "N";
            this.#usesDateType = true;
          }

          this.AttributeDefinitions.push({
            AttributeName: e,
            AttributeType: t,
          });
        }

        if (key.sortKey) {
          key.required = true;

          let t = key.type;

          if (t == "D") {
            t = "N";
            this.#usesDateType = true;
          }

          this.KeySchema.push({
            AttributeName: e,
            KeyType: "RANGE",
          });

          if (!this.AttributeDefinitions.find((x) => x.AttributeName == e)) {
            this.AttributeDefinitions.push({
              AttributeName: e,
              AttributeType: t,
            });
          }
        }
      }

      schema[e] = key;
    });

    const hashKey = this.KeySchema.find((x) => x.KeyType == "HASH");
    if (!hashKey) {
      throw new DynamoQLException("primaryIndex is missing in your Schema");
    }

    this.LocalSecondaryIndexes = this.LocalSecondaryIndexes.map((x) => {
      x.KeySchema.unshift(hashKey);
      return x;
    });

    return schema;
  }
  #verifyPk(pk) {
    const keys = Object.keys(pk);

    for (const key of keys) {
      if (pk[key] === undefined) {
        throw new DynamoQLException(`'${key}' can not use 'undefined' as condition value.`);
      }
    }
  }
  marshallPk: (pk: any) => Record<string, AttributeValue>;
  constructor(schema: T & HasPrimaryIndex<T> & SchemaConstructor<T>) {
    this.fields = this.#parseSchema(schema);
    // @ts-ignore
    this.type = "M";
    // @ts-ignore
    this.required = true;

    if (this.#usesDateType) {
      this.marshallPk = (pk: any) => {
        let keys = isJsObject(pk) ? pk : { [this.primaryIndex]: pk };
        for (const [k, v] of Object.entries(keys)) {
          keys[k] = this.fields[k].type == "D" ? getDateTimestamp(this.fields[k], v as any) : v;
        }

        this.#verifyPk(keys);
        return marshall(keys);
      };
    } else {
      this.marshallPk = (pk: any) => {
        const keys = isJsObject(pk) ? pk : { [this.primaryIndex]: pk };
        this.#verifyPk(keys);
        return marshall(keys);
      };
    }
  }

  #isIndexableType(t: string) {
    return INDEXABLES.indexOf(t) != -1;
  }
  /**
   * @internal
   */
  #cachedKeyPath: Map<string, any> = new Map();
  getTypeFromKeyPath(keyPath: string | AttributePath) {
    const path = keyPath instanceof AttributePath ? keyPath.path : keyPath;
    const normalizedPath = path.replace(/\[\d\]/g, "[#]");

    if (this.#cachedKeyPath.has(normalizedPath)) {
      return this.#cachedKeyPath.get(normalizedPath);
    }
    const foundType = pathToSchema(this, path);

    this.#cachedKeyPath.set(normalizedPath, foundType);
    return foundType;
  }
}

type PrimaryKey<K extends string | number | symbol, T> = {
  [P in K]: T;
};

export type ExtractPrimaryKey<T> = {
  [K in keyof T]: T[K] extends { primaryIndex?: true; sortKey?: true } ? PrimaryKey<K, ExtractNativeType<T[K]>> : never;
}[keyof T];

type GetSecondaryNames<T> = {
  [K in keyof T]: T[K] extends { LSI: { indexName: infer IndexName } } ? IndexName : never;
};
type GetGlobalNames<T> = {
  [K in keyof T]: T[K] extends { GSI: { indexName: infer IndexName } } ? IndexName : never;
};
type GetNames<T> = GetSecondaryNames<T> | GetGlobalNames<T>;

type ExtractIndexNames<T> = GetNames<T>[keyof T];

type HasPrimaryIndex<T> = GetPartitionKey<T> extends never ? { _RUNTIME_ERROR_: "❌⛔️ Schema must include primaryIndex ❗️" } : T;
