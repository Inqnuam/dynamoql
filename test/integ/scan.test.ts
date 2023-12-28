import { describe, beforeAll, it, expect } from "vitest";
import { clientConfig } from "./models/common";
import { Model, Null, Schema } from "../../dist";
import { randomUUID } from "crypto";

const schema = new Schema({
  id: {
    type: String,
    primaryIndex: true,
    default: randomUUID,
  },
  name: {
    type: String,
    default: randomUUID,
  },
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
  // reserved keyword
  data: {
    required: true,
    type: [
      Boolean,
      Null,
      {
        type: String,
        get(self, item, getterInfo) {
          if (getterInfo?.forFrontend) {
            return null;
          }

          return self;
        },
      },
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

  bigData: {
    type: Buffer,
  },
  someSet: {
    type: Set,
    items: Number,
  },
  veryNullValue: {
    type: Null,
  },
  someNumber: {
    type: Number,
  },
  someBigInt: {
    type: BigInt,
  },
} as const);

const Fruits = new Model("fruits2", schema, clientConfig);

describe("Scan", () => {
  beforeAll(async () => {
    try {
      await Fruits.table.delete();
    } catch (error) {}
    await Fruits.table.create();
    await Fruits.batchPut([
      {
        data: "some-data-1",
        weight: 3,
      },
      {
        data: "some-data-2",
      },
      {
        data: {
          country: "UK",
        },
      },
      {
        data: "some-data-4",
      },
      {
        data: "some-data-5",
      },
      {
        data: "some-data-6",
      },
      {
        data: "some-data-7",
      },
      {
        data: "some-data-8",
      },
      {
        id: "some-id",
        data: "some-data-9",
        name: "some-name",
      },
      {
        data: "some-data-10",
      },
      {
        data: "some-data-11",
      },
      {
        data: "some-data-12",
      },
    ]);
  });

  it("should scan without filter", async () => {
    const { Items } = await Fruits.scan();

    expect(Items).not.empty;
  });

  it("should scan with empty filter condition", async () => {
    const { Items } = await Fruits.scan({});

    expect(Items).not.empty;
  });

  it("should scan with empty filter condition and select", async () => {
    const { Items } = await Fruits.scan({}, { Select: ["data"] });

    expect(Items).not.empty;
  });

  it("should scan with number condition", async () => {
    const { Items } = await Fruits.scan({ weight: { $gt: 2 } }, { Select: ["data"] });

    expect(Items).toHaveLength(1);
  });

  it("should scan with $or conditions", async () => {
    const { Items } = await Fruits.scan({ $or: [{ weight: { $gt: 2 } }, { data: { $type: Object } }] }, { Select: ["data"] });

    expect(Items).toHaveLength(2);
  });

  it("should scan with iteration token", async () => {
    const { LastEvaluatedKey } = await Fruits.scan({}, { Limit: 2 });

    const { Items } = await Fruits.scan({}, { ExclusiveStartKey: LastEvaluatedKey });

    expect(Items).toHaveLength(10);
  });

  it("should scan and ruturn count instead of items", async () => {
    const res = await Fruits.scan({}, { Select: "COUNT" });

    // @ts-expect-error
    res.Items;
    expect(res.Count).toBe(12);
  });

  it("should scan and ruturn return only selected atttributes", async () => {
    const { Items } = await Fruits.scan({ data: "some-data-9" }, { Select: ["data", "id"] });
    const [Item] = Items;

    expect(Items).toHaveLength(1);

    // @ts-expect-error
    Item.name;

    expect(Item.data).eq("some-data-9");
    expect(Item.id).toBeTypeOf("string");
  });

  it("should apply getterInfo", async () => {
    const { Items } = await Fruits.scan({ data: "some-data-9" }, { getterInfo: { forFrontend: true } });
    const [Item] = Items;
    expect(Item.data).eq(null);
  });

  it("should not execute", async () => {
    const input = await Fruits.scan(
      {
        data: {
          $eq: { country: "UK" },
        },
      },
      { exec: false, Select: "ALL" }
    );
    expect(input).deep.eq({
      TableName: Fruits.table.name,
      FilterExpression: "#n0 = :v1",
      Select: "ALL_ATTRIBUTES",
      ExpressionAttributeNames: { "#n0": "data" },
      ExpressionAttributeValues: { ":v1": { M: { country: { S: "UK" } } } },
    });
  });
});
