import { Model, Schema, Null } from "../../../dist";
import { randomUUID } from "crypto";
import { clientConfig } from "./common";

const stringType = {
  type: String,
  required: false,
} as const;

const id = {
  type: String,
  primaryIndex: true,
  default: randomUUID,
} as const;

const schema = new Schema({
  id,
  firstname: {
    required: true,
    type: String,
    trim: true,
    maxLength: 8,
    uppercase: false,
  },
  lastname: {
    type: String,
    required: false,
    capitalize: false,
  },
  age: {
    type: Number,
    required: false,
  },
  skill: {
    type: Number,
    default: 5,
    enum: [0, 5, 10, 15],
  },
  birthday: {
    type: Number,
    required: false,
    default: Date.now,
  },
  valodik: stringType,
  data: {
    type: Object,
    required: true,
    // allowUndeclared: true,
    fields: {
      anotherTrimmableFields: { type: String, trim: true, required: true },
      nested: {
        type: Object,
        required: false,

        // allowUndeclared: true,
        fields: {
          bobo: {
            type: Object,
            fields: {
              toto: {
                type: Object,
                fields: {
                  lolo: Number,
                  /**
                   * @description this is an array of string and it is a required property
                   */
                  vaxarsham: {
                    required: true,
                    type: Array,
                    items: {
                      type: String,
                    },
                  },
                },
              },

              city: {
                type: String,
              },
            },
          },
        },
      },
      rank: {
        type: Number,
        enum: [1, 2, 3],
      },

      country: {
        type: String,
        default: () => {
          return "France";
        },
        required: true,
      },
      last: {
        type: Array,
        items: Number,
      },
    },
  },

  sex: {
    type: String,
    enum: ["F", "M"],
    required: true,
  },
  miaou: {
    type: Object,
    required: false,
    allowUndeclared: false,
    fields: {
      himar: {
        type: Number,
        min: 500,
      },
    },
  },

  himar: {
    type: Object,
    required: false,
    fields: {
      tapor: {
        type: Number,
      },
      mator: {
        type: Object,
        fields: {},
      },
    },
  },
  kotosh: stringType,
  last: Number,
  resultsBySport: {
    type: Object,
    required: true,
    // allowUndeclared: false,
    fields: {
      tennis: Number,
      football: {
        type: Number,
      },
    },
  },
  popo: {
    type: Array,
    required: false,
    items: String,
  },
  items: {
    type: Array,
    items: String,
  },
  matrix: {
    type: Array,
    items: {
      type: Object,
      fields: {
        name: {
          type: String,
        },
        value: {
          type: String,
        },
      },
    },
  },

  cars: {
    type: Set,
    items: {
      type: String,
    },
  },

  image: {
    type: Buffer,
  },
  retired: {
    type: Boolean,
  },
  champion: {
    type: Null,
  },
  /**
   * @description date of ATP/WTA registration
   */
  register: {
    type: Date,
  },
  ttl: {
    type: Date,
    format: "EPOCH",
  },
  events: {
    type: Set,
    items: Date,
  },
} as const);

export const Players = new Model("players", schema, clientConfig);
export type Player = (typeof schema)["PutItem"];
