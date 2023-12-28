import { Model, Schema, Null } from "../../../dist";
import { randomUUID } from "crypto";
import { clientConfig } from "./common";

const schema = new Schema({
  id: {
    type: String,
    primaryIndex: true,
    default: randomUUID,
  },
  date: {
    type: Number,
    default: Date.now,
  },
  userId: String,
  articleId: Number,
  deleted: {
    type: Boolean,
  },
  text: String,
  views: {
    type: Number,
    default: 0,
  },
  likedBy: {
    type: Set,
    items: String,
  },
  answers: {
    type: Array,
    items: {
      type: Object,
      fields: {
        id: String,
        userId: String,
        date: {
          type: Number,
          required: true,
        },
        reported: {
          type: Boolean,
          default: false,
        },
        text: {
          type: String,
          required: true,
          minLength: 3,
          maxLength: 140,
          capitalize: true,
          set: (self: string, item, info) => {
            if (info?.exec === false) {
              return self;
            }
            let newValue: string = "";
            if (typeof self == "string") {
              newValue = self.replace("stupid", "intelligent");
            }
            return newValue;
          },
          validate: async (self: string) => {
            if (self == "INVALID_VALUE") {
              return "INVALID_VALUE is not accepted";
            }
          },
        },
        attachments: {
          type: Array,
          items: {
            type: Object,
            allowUndeclared: true,
            fields: {
              name: {
                type: String,
                required: true,
                lowercase: true,
                trim: true,
              },
              content: {
                type: Buffer,
                required: true,
                min: 5,
                max: 10,
              },
              size: {
                type: Number,
                required: true,
                min: 5,
                max: 30,
              },
              type: {
                type: String,
                required: true,
                enum: ["image", "audio"],
              },
              downloadedBy: {
                type: Set,
                items: {
                  type: String,
                  minLength: 2,
                  trim: true,

                  set: (self: any) => {
                    if (self == "") {
                      return undefined;
                    }
                    return self;
                  },
                },
              },
              /**
               * @description This is a required field which type may be ANYthing
               */
              dummyData: {
                type: [
                  { type: Object, fields: {} },
                  Boolean,
                  Null,
                  {
                    type: String,
                    uppercase: true,
                    set: (self: string) => {
                      return `${self}-dummyValue`;
                    },
                    validate: (self: string) => {
                      if (self == "INVALID_VALUE-dummyValue") {
                        return "INVALID_VALUE-dummyValue is not accepted";
                      }
                    },
                  },
                ],
                required: true,
              },
            },
          },
        },
      },
    },
  },
  flag: Null,
  dummyAttribute: {
    type: String,
  },
  updatedDate: { type: Date },
  TTL: { type: Date, format: "EPOCH", min: new Date("2018"), max: new Date("2034") },
} as const);

export const Comments = new Model("comments", schema, clientConfig);
export type Comment = (typeof schema)["PutItem"];
