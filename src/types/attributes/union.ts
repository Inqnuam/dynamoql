import { GetFieldType } from "../schema";
import { SchemaType } from "../utils";

export type PredictUnion<T extends readonly [...SchemaType[]]> = readonly GetFieldType<T[number]>[];

// const myDbType = [{ type: Number }] as const;
// type Himar = PredictUnion<typeof myDbType>;

// const himar: Himar = [
//   {
//     type: Number,
//   },
// ];
