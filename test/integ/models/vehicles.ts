import { Model, Schema, Null, Any } from "../../../dist";
import { randomUUID } from "crypto";
import { Person, clientConfig } from "./common";

const schema = new Schema({
  id: {
    type: String,
    primaryIndex: true,
    default: randomUUID,
  },
  year: {
    type: Date,
    sortKey: true,
  },

  orders: {
    type: Number,
    required: false,
  },
  image: {
    type: Buffer,
    GSI: {
      indexName: "image-index",
      project: "ALL",
    },
  },
  variants: {
    type: Set,
    items: {
      type: Number,
    },
  },
  inStock: {
    type: Boolean,
  },
  make: {
    type: String,
    enum: ["BMW", "Audi"],
  },
  owner: {
    type: Object,
    fields: {
      firstname: String,
      lastname: String,
    },
    get: (self) => {
      return new Person(self.firstname, self.lastname);
    },
  },
} as const);

export const Vehicles = new Model("vehicles", schema, clientConfig);
export type VehiclesSchema = (typeof schema)["PutItem"];
