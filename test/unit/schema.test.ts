import { describe, it, expect } from "vitest";
import { Schema } from "../../dist";

describe("Test Schema definition", () => {
  it("should define HASH table", () => {
    const schema = new Schema({
      id: { type: Buffer, primaryIndex: true },
      authorId: { type: String },
    } as const);

    expect(schema.AttributeDefinitions).deep.eq([{ AttributeName: "id", AttributeType: "B" }]);
    expect(schema.KeySchema).deep.eq([{ AttributeName: "id", KeyType: "HASH" }]);
    expect(schema.GlobalSecondaryIndexes).deep.eq([]);
    expect(schema.LocalSecondaryIndexes).deep.eq([]);
    expect(schema.fields.id.required).toBeTruthy();
    expect(schema.fields.authorId.required).toBeUndefined();
  });

  it("should define HASH and RANGE table", () => {
    const schema = new Schema({
      groupId: { type: String, primaryIndex: true },
      messageId: { type: Number, sortKey: true, description: "Used to filter messages" },
      authorId: String,
    } as const);

    expect(schema.AttributeDefinitions).deep.eq([
      { AttributeName: "groupId", AttributeType: "S" },
      { AttributeName: "messageId", AttributeType: "N" },
    ]);
    expect(schema.KeySchema).deep.eq([
      { AttributeName: "groupId", KeyType: "HASH" },
      { AttributeName: "messageId", KeyType: "RANGE" },
    ]);
    expect(schema.GlobalSecondaryIndexes).deep.eq([]);
    expect(schema.LocalSecondaryIndexes).deep.eq([]);
    expect(schema.fields.groupId.required).toBeTruthy();
    expect(schema.fields.messageId.required).toBeTruthy();
    expect(schema.fields.authorId.required).toBeTruthy();
  });

  it("should define HASH table and GSI HASH table with project all", () => {
    const schema = new Schema({
      authorId: { type: String, GSI: { indexName: "author-index", project: "ALL" } },
      id: { type: Buffer, primaryIndex: true },
    } as const);

    expect(schema.KeySchema).deep.eq([{ AttributeName: "id", KeyType: "HASH" }]);
    expect(schema.LocalSecondaryIndexes).deep.eq([]);
    expect(schema.AttributeDefinitions).deep.eq([
      { AttributeName: "authorId", AttributeType: "S" },
      { AttributeName: "id", AttributeType: "B" },
    ]);

    expect(schema.GlobalSecondaryIndexes).deep.eq([
      {
        IndexName: "author-index",
        KeySchema: [
          {
            AttributeName: "authorId",
            KeyType: "HASH",
          },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ]);
  });

  it("should define HASH table and GSI HASH table with specified project attributes", () => {
    const schema = new Schema({
      authorId: { type: String, GSI: { indexName: "author-index", project: ["name"] } },
      id: { type: Buffer, primaryIndex: true },
      name: String,
    } as const);

    expect(schema.KeySchema).deep.eq([{ AttributeName: "id", KeyType: "HASH" }]);
    expect(schema.LocalSecondaryIndexes).deep.eq([]);
    expect(schema.AttributeDefinitions).deep.eq([
      { AttributeName: "authorId", AttributeType: "S" },
      { AttributeName: "id", AttributeType: "B" },
    ]);

    expect(schema.GlobalSecondaryIndexes).deep.eq([
      {
        IndexName: "author-index",
        KeySchema: [
          {
            AttributeName: "authorId",
            KeyType: "HASH",
          },
        ],
        Projection: { NonKeyAttributes: ["name"], ProjectionType: "INCLUDE" },
      },
    ]);
  });

  it("should define HASH table and multiple GSI", () => {
    const schema = new Schema({
      authorId: { type: String, GSI: { indexName: "author-index", project: ["name"] } },
      id: { type: Buffer, primaryIndex: true },
      name: String,
      orderId: {
        type: String,
        GSI: {
          indexName: "order-index",
          project: "KEYS",
        },
      },
    } as const);

    expect(schema.KeySchema).deep.eq([{ AttributeName: "id", KeyType: "HASH" }]);
    expect(schema.LocalSecondaryIndexes).deep.eq([]);
    expect(schema.AttributeDefinitions).deep.eq([
      { AttributeName: "authorId", AttributeType: "S" },
      { AttributeName: "id", AttributeType: "B" },
      { AttributeName: "orderId", AttributeType: "S" },
    ]);

    expect(schema.GlobalSecondaryIndexes).deep.eq([
      {
        IndexName: "author-index",
        KeySchema: [
          {
            AttributeName: "authorId",
            KeyType: "HASH",
          },
        ],
        Projection: { NonKeyAttributes: ["name"], ProjectionType: "INCLUDE" },
      },
      {
        IndexName: "order-index",
        KeySchema: [
          {
            AttributeName: "orderId",
            KeyType: "HASH",
          },
        ],
        Projection: { ProjectionType: "KEYS_ONLY" },
      },
    ]);
  });

  it("should define HASH table and multiple GSI and LSI", () => {
    const schema = new Schema({
      authorId: { type: String, sortKey: true, GSI: { indexName: "author-index", project: ["name"] } },
      id: { type: Buffer, primaryIndex: true },
      name: String,
      age: Number,
      orderId: {
        type: String,
        GSI: {
          indexName: "order-index",
          project: "KEYS",
        },
        LSI: {
          indexName: "order-lsi",
          project: ["age"],
        },
      },
      fruits: {
        type: Number,
        LSI: {
          indexName: "fruits-lsi",
          project: "KEYS",
        },
      },
    } as const);

    expect(schema.KeySchema).deep.eq([
      {
        AttributeName: "authorId",
        KeyType: "RANGE",
      },
      { AttributeName: "id", KeyType: "HASH" },
    ]);
    expect(schema.LocalSecondaryIndexes).deep.eq([
      {
        IndexName: "order-lsi",
        KeySchema: [
          {
            AttributeName: "id",
            KeyType: "HASH",
          },
          {
            AttributeName: "orderId",
            KeyType: "RANGE",
          },
        ],
        Projection: {
          NonKeyAttributes: ["age"],
          ProjectionType: "INCLUDE",
        },
      },
      {
        IndexName: "fruits-lsi",
        KeySchema: [
          {
            AttributeName: "id",
            KeyType: "HASH",
          },
          {
            AttributeName: "fruits",
            KeyType: "RANGE",
          },
        ],
        Projection: {
          ProjectionType: "KEYS_ONLY",
        },
      },
    ]);
    expect(schema.AttributeDefinitions).deep.eq([
      { AttributeName: "authorId", AttributeType: "S" },
      { AttributeName: "id", AttributeType: "B" },
      { AttributeName: "orderId", AttributeType: "S" },
      { AttributeName: "fruits", AttributeType: "N" },
    ]);

    expect(schema.GlobalSecondaryIndexes).deep.eq([
      {
        IndexName: "author-index",
        KeySchema: [
          {
            AttributeName: "authorId",
            KeyType: "HASH",
          },
        ],
        Projection: { NonKeyAttributes: ["name"], ProjectionType: "INCLUDE" },
      },
      {
        IndexName: "order-index",
        KeySchema: [
          {
            AttributeName: "orderId",
            KeyType: "HASH",
          },
        ],
        Projection: { ProjectionType: "KEYS_ONLY" },
      },
    ]);
  });
});

describe("Test Schema marshallPk", () => {
  it("should marshall from primitive", () => {
    const schema = new Schema({
      id: { type: Buffer, primaryIndex: true },
      authorId: { type: String },
    } as const);

    const pk = schema.marshallPk(Buffer.from("Hello WORLD"));

    expect(pk).deep.eq({ id: { B: Buffer.from("Hello WORLD") } });
  });

  it("should marshall from primitive with an object", () => {
    const schema = new Schema({
      id: { type: String, primaryIndex: true },
      message: String,
    } as const);

    const pk = schema.marshallPk({ id: "user-1" });

    expect(pk).deep.eq({ id: { S: "user-1" } });
  });

  it("should marshall primary key", () => {
    const schema = new Schema({
      id: { type: Number, primaryIndex: true },
      date: { type: Date, sortKey: true },
      message: String,
      authorId: { type: String },
    } as const);

    const pk = schema.marshallPk({ id: 2432, date: new Date("2023") });

    expect(pk).deep.eq({ id: { N: "2432" }, date: { N: "1672531200000" } });
  });
});
