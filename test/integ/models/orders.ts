import { Model, Schema } from "../../../dist";
import { randomUUID } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { clientConfig } from "./common";

const schema = new Schema({
  /**
   * @description partition key
   */
  productId: {
    type: String,
    primaryIndex: true,
  },
  /**
   * @description sort key
   */
  date: {
    type: Number,
    sortKey: true,
  },
  id: {
    type: String,
    default: randomUUID,
  },
  userId: {
    type: String,
    required: true,
    GSI: {
      indexName: "Users",
      project: ["userId"],
      sortKey: false,

      capacity: {
        read: 6,
        write: 3,
      },
    },
    LSI: {
      project: ["age", "productId"],
      indexName: "userids",
    },
  },

  /**
   * @description users age
   */
  age: {
    type: Number,
    required: false,
    GSI: {
      indexName: "Users",
      sortKey: true,
    },
  },
  birthday: {
    type: Date,
    GSI: {
      indexName: "bday",
      project: ["city"],
    },
  },
  city: {
    type: String,
    required: false,
    LSI: {
      indexName: "cities",
      project: "KEYS",
    },
  },
} as const);

export const Orders = new Model("orders", schema, clientConfig);

export type OrdersSchema = (typeof schema)["PutItem"];

export const client = new DynamoDBClient(clientConfig);
