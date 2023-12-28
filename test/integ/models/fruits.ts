import { Model, Null, Schema } from "../../../dist";
import { randomUUID } from "crypto";
import { clientConfig, Person } from "./common";

export const schema = new Schema({
  id: {
    type: String,
    primaryIndex: true,
    default: randomUUID,
  },
  name: String,
  weight: {
    type: Number,
  },
  vitamins: {
    type: Object,

    fields: {
      C: {
        type: Number,
        min: 1,
      },
      K: Number,
    },
  },
  author: {
    type: Object,
    fields: {
      firstname: String,
      lastname: String,
    },
    get(self) {
      return new Person(self.firstname, self.lastname);
    },
  },
  // reserved keyword
  data: {
    required: true,
    type: [
      Boolean,
      Null,
      String,
      {
        type: Object,

        fields: {
          country: String,
        },
      },
      {
        type: Set,
        items: {
          type: String,
          minLength: 5,
        },
      },
      {
        type: Array,
        items: String,
      },
      {
        type: Set,
        items: {
          type: Number,
          enum: [5, 10, 15, 20],
        },
      },
    ],
  },
} as const);

export const Fruits = new Model("fruits", schema, clientConfig);
export type Fruit = (typeof schema)["PutItem"];

// NOTE provide type utility to extract  this easly ?
const id: (typeof schema)["primaryKey"] = {
  id: "",
};
