import { randomUUID } from "crypto";
import { Model, Schema } from "../../../dist";
const clientConfig = { region: "eu-west-3", endpoint: "http://localhost:8000" };

const schema = new Schema({
  id: {
    type: String,
    primaryIndex: true,
    default: randomUUID,
  },

  firstname: String,
  lastname: String,
  address: {
    type: Object,
    fields: {
      country: String,
      zip: Number,
      city: String,
      street: String,
      // reserved word
      foreign: Boolean,
    },
  },
  contact: {
    type: Array,
    items: {
      type: Object,

      fields: {
        home: { type: Boolean, required: false },
        tel: Number,
        email: String,
        // reserved word
        hour: {
          type: Object,

          fields: {
            // reserved word
            min: Number,
            max: Number,
          },
        },
      },
    },
  },
  // reserved word
  group: {
    type: Number,
    required: false,
  },
  // reserved word
  data: {
    type: Buffer,
    get: (self: Buffer, item) => {
      if (self.toString("utf-8") == "Hello") {
        return "WORLD";
      }
      return self;
    },
  },
  TTL: {
    type: Number,
    set: (self: number) => Math.round(new Date(self).getTime() / 1000),
    get: (self: number) => new Date(self * 1000),
  },
  orders: {
    type: Set,
    items: {
      type: String,
      get: (self: string, item) => {
        if (self == "order-x") {
          return "unknown";
        }
        return self;
      },
    },
  },

  dummyData: [
    {
      type: Number,
      get: () => {
        return 999;
      },
    },
    {
      type: String,
      get: () => {
        return "xxx";
      },
    },
    {
      type: Object,
      fields: {
        awsomeWorld: {
          type: String,
          get: (self: string, item: any, info: any) => {
            if (info?.exec === false) {
              return self;
            }
            return "awsomeWorld";
          },
        },
      },
    },
    {
      type: Object,
      fields: {
        awsomeWorld: {
          type: Number,
          get: () => {
            return 999;
          },
        },
      },
    },
  ],
} as const);

export const CustomersTr = new Model("customers-tr", schema, clientConfig);
export type CustomerTr = (typeof schema)["PutItem"];
