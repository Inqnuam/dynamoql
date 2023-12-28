import { Model, Schema } from "../../../dist";
import { Person, clientConfig } from "./common";

const schema = new Schema({
  victories: {
    type: Number,
    LSI: {
      indexName: "victories-index",
      project: "ALL",
    },
  },
  id: {
    type: String,
    primaryIndex: true,
  },
  firstname: {
    type: String,
    trim: true,
    minLength: 3,
    GSI: {
      indexName: "names",

      sortKey: true,
    },
  },
  rank: {
    type: Number,
  },
  lastname: {
    type: String,
    GSI: {
      indexName: "names",
      project: "ALL",
      sortKey: false,
    },
  },
  age: {
    type: Number,
    sortKey: true,
  },

  defeats: {
    type: Number,
    LSI: {
      indexName: "defeats",
      project: ["id"],
    },
  },
  friends: {
    type: Array,
    items: String,
  },
  garbageData: {
    type: [{ type: Object, fields: {} }, Buffer],
  },
  bestFriend: {
    type: Object,
    fields: {
      firstname: String,
      lastname: String,
    },
    get(self) {
      return new Person(self.firstname, self.lastname);
    },
  },
} as const);
export const Users = new Model("users", schema, clientConfig);
export type User = (typeof schema)["PutItem"];
