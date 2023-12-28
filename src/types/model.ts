import type { ExtractNativeType, ExtractOptionnalKeys } from "./schema";
import { IndexPathsUpdateExpressions } from "./attributes/object";
import { GetPartitionKey, GetSortKey } from "./utils";

export type __updateExpr<B> = IndexPathsUpdateExpressions<B> & {
  $set?: { [K in keyof B]?: ExtractNativeType<B[K]> };

  /**
   * Remove one or multiple `optionnal` attribute(s).
   */
  $remove?: ExtractOptionnalKeys<B> | [ExtractOptionnalKeys<B>, ...ExtractOptionnalKeys<B>[]];
};

export type updateExpr<B> = Omit<__updateExpr<B>, GetPartitionKey<B> | GetSortKey<B>>;
