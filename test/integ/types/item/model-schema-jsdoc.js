// @ts-check

import { Model, Schema, Null } from "../../../../dist";
import { randomUUID } from "crypto";
const clientConfig = { region: "eu-west-3", endpoint: "http://localhost:8000" };

const schema = new Schema(
  /** @type {const} */
  ({
    id: {
      type: String,
      primaryIndex: true,

      default: randomUUID,
    },
    active: {
      type: Boolean,
    },
    members: {
      type: Array,
      required: true,
      items: String,
    },
    messages: {
      type: Array,
      items: {
        type: Object,
        fields: {
          id: {
            type: String,
            default: randomUUID,
          },
          from: String,
          receivedBy: [Null, { type: Array, items: String }],
          text: {
            type: String,
            required: true,
            minLength: 1,
            maxLength: 140,
          },
          attachments: {
            type: Array,
            required: false,
            items: {
              type: Object,

              fields: {
                id: {
                  type: String,
                  required: true,
                  default: randomUUID,
                },
                partId: {
                  type: String,
                },
                multipart: Boolean,
                name: String,
                content: Buffer,
                type: {
                  type: String,
                  required: true,
                  enum: ["image", "video", "audio", "calendar"],
                },
                stored: {
                  type: [Boolean, { type: Object, fields: { bucket: String, size: Number } }],
                  required: true,
                },
                downloadedBy: {
                  type: Set,
                  items: String,
                },
              },
            },
          },
        },
      },
    },
  })
);

export const Conversations = new Model("conversations", schema, clientConfig);

/**
 * @typedef {schema["PutItem"]} Conversation
 */
