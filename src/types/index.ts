import { GetPartitionKey, GetSortKey } from "./utils";

type GetIndexedFields<T, F extends keyof T> = T[F] extends { LSI: { indexName: infer IndexName } }
  ? {
      [K in keyof T]: T[K] extends { LSI: { indexName: IndexName } } | { GSI: { indexName: IndexName } } ? K : never;
    }[keyof T]
  : never;

type GetIndexedFieldsForGSIHash<T, F extends keyof T> = T[F] extends { GSI: { indexName: infer IndexName } }
  ? {
      [K in keyof T]: T[K] extends { LSI: { indexName: IndexName } } | { GSI: { indexName: IndexName; sortKey?: never | false } } ? K : never;
    }[keyof T]
  : never;

type GetGlobalSortKeyFields<T, F extends keyof T> = T[F] extends { GSI: { indexName: infer IndexName } }
  ? {
      [K in keyof T]: T[K] extends { GSI: { indexName: IndexName; sortKey: true } } ? K : never;
    }[keyof T]
  : never;

interface SecondaryIndex<T, K extends keyof T> {
  /**
   * @description available values are "ALL" | "KEYS" | or an array of Schema keys
   */
  project: ("ALL" | "KEYS") | readonly (keyof T)[];
  indexName: Exclude<GetIndexedFields<T, K>, K> extends never ? string : { _RUNTIME_ERROR_: "❌⛔️ 'indexName' must be unique across the Schema ❗️" };
}

interface GlobalIndex {
  /**
   * @description is 'RANGE' attribute of Global Index
   */
  sortKey?: boolean;
  project?; //: ("ALL" | "KEYS") | readonly string[];
  capacity?: {
    read: number;
    write: number;
  };
}

type GetAvailableGSINames<T> = {
  [K in keyof T]: T[K] extends { GSI: { sortKey?: false; indexName } } ? T[K]["GSI"]["indexName"] : never;
}[keyof T];

type GetGSIKeyType<T, K extends keyof T> = T[K] extends { GSI: { sortKey: true } }
  ? {
      indexName: GetAvailableGSINames<T>;
      sortKey: Exclude<GetGlobalSortKeyFields<T, K>, K> extends never ? true : { _RUNTIME_ERROR_: "❌⛔️ GSI can have only one 'sortKey'❗️" };
      project?: never;
      capacity?: never;
    }
  : {
      indexName: Exclude<GetIndexedFieldsForGSIHash<T, K>, K> extends never ? string : { _RUNTIME_ERROR_: "❌⛔️ 'indexName' must be unique across the Schema ❗️" };
      /**
       * @description available values are "ALL" | "KEYS" | or an array of Schema keys
       */
      project: ("ALL" | "KEYS") | readonly (keyof T)[];
      sortKey?: false | never;
      capacity?: {
        read: number;
        write: number;
      };
    };

export interface AttributeProperties<T, K extends keyof T> {
  /**
   * @description is 'HASH' attribute of primary Table.
   */
  primaryIndex?: Exclude<GetPartitionKey<T>, K> extends never
    ? T[K] extends { sortKey: true }
      ? { _RUNTIME_ERROR_: "❌⛔️ An Attribute CAN NOT be both 'primaryIndex' (HASH) and 'sortKey' (RANGE) key. Instead consider GSI ❗️" } | false
      : boolean
    : { _RUNTIME_ERROR_: "❌⛔️ Schema CAN NOT have multiple 'primaryIndex'. Instead consider 'GSI' (GSI) ❗️" } | false;
  /**
   * @description is 'RANGE' attribute of primary Table.
   */
  sortKey?: Exclude<GetSortKey<T>, K> extends never
    ? boolean
    : { _RUNTIME_ERROR_: "❌⛔️ Schema CAN NOT have multiple 'sortKey' (RANGE) key. Instead consider LSI or GSI ❗️" } | false;
  /**
   * @description define a GSI
   */
  GSI?: "GSI" extends keyof T[K] ? GlobalIndex & GetGSIKeyType<T, K> : never;
  /**
   * @description define a LSI
   */
  LSI?: GetSortKey<T> extends never
    ? { _RUNTIME_ERROR_: "❌⛔️ LSI are not allowed on 'HASH only' tables. Your Schema must include an attribute with 'sortKey: true' ❗️" }
    : SecondaryIndex<T, K>;
}
