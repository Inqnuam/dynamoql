import { describe, beforeAll, it, expect } from "vitest";
import { Orders } from "./models/orders";
import { randomUUID } from "crypto";

const orangeId = randomUUID();
const appleId = randomUUID();
const johnId = randomUUID();
const saraId = randomUUID();

describe("Test composite tables", async () => {
  beforeAll(async () => {
    try {
      await Orders.table.delete();
    } catch (error) {}
    await Orders.table.create();
  });

  it("Test Table schema creation", async () => {
    const { Table } = await Orders.table.describe();

    expect(Table.LocalSecondaryIndexes).deep.eq([
      {
        IndexName: "cities",
        KeySchema: [
          { AttributeName: "productId", KeyType: "HASH" },
          { AttributeName: "city", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "KEYS_ONLY" },
        IndexSizeBytes: 0,
        ItemCount: 0,
        IndexArn: "arn:aws:dynamodb:ddblocal:000000000000:table/orders/index/cities",
      },
      {
        IndexName: "userids",
        KeySchema: [
          { AttributeName: "productId", KeyType: "HASH" },
          { AttributeName: "userId", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "INCLUDE", NonKeyAttributes: ["age", "productId"] },
        IndexSizeBytes: 0,
        ItemCount: 0,
        IndexArn: "arn:aws:dynamodb:ddblocal:000000000000:table/orders/index/userids",
      },
    ]);

    expect(Table.GlobalSecondaryIndexes).deep.eq([
      {
        IndexArn: "arn:aws:dynamodb:ddblocal:000000000000:table/orders/index/bday",
        IndexName: "bday",
        IndexSizeBytes: 0,
        IndexStatus: "ACTIVE",
        ItemCount: 0,
        KeySchema: [{ AttributeName: "birthday", KeyType: "HASH" }],
        Projection: { ProjectionType: "INCLUDE", NonKeyAttributes: ["city"] },
        ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
      },
      {
        IndexArn: "arn:aws:dynamodb:ddblocal:000000000000:table/orders/index/Users",
        IndexName: "Users",
        IndexSizeBytes: 0,
        IndexStatus: "ACTIVE",
        ItemCount: 0,
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "age", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "INCLUDE", NonKeyAttributes: ["userId"] },
        ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
      },
    ]);
  });

  it("should get by primary key", async () => {
    const date = new Date("2023-08-20").getTime();
    await Orders.put({
      productId: orangeId,
      date,
      userId: johnId,
    });
    const { Item } = await Orders.get({
      productId: orangeId,
      date,
    });
    const { id, ...RestValues } = Item;
    expect(RestValues).deep.eq({
      date,
      productId: orangeId,
      userId: johnId,
    });
    const date2 = new Date("2023-08-26").getTime();
    await Orders.put({
      productId: orangeId,
      date: date2,
      userId: johnId,
    });
    const { Item: Item2 } = await Orders.get({
      productId: orangeId,
      date: date2,
    });
    const { id: _, ...RestValues2 } = Item2;
    expect(RestValues2).deep.eq({
      date: date2,
      productId: orangeId,
      userId: johnId,
    });
  });

  describe("Test query on main table", () => {
    it("Should find items by productId and date", async () => {
      const { Items } = await Orders.query({
        productId: orangeId,
        date: {
          $gte: new Date("2023-08-22").getTime(),
        },
      });
      expect(Items.length).toBe(1);
    });
    it("Should find items by productId and date", async () => {
      await Orders.put({
        productId: orangeId,
        date: new Date("2023-08-24").getTime(),
        userId: saraId,
      });
      const { Items } = await Orders.query({
        productId: orangeId,
        date: {
          $gte: new Date("2023-08-22").getTime(),
        },
        userId: saraId,
      });
      expect(Items.length).toBe(1);
    });

    it("Should find items by userId and date", async () => {
      const date = new Date("2023-08-24").getTime();
      await Orders.put({
        productId: orangeId,
        date,
        userId: saraId,
      });
      const { Items } = await Orders.query({
        productId: orangeId,
        date,
        userId: saraId,
      });
      expect(Items.length).toBe(1);
    });
  });

  describe("should find with using() method", () => {
    it("LSI with comopsite table", async () => {
      const id = "some id";
      const date = new Date("2023-08-23").getTime();
      await Orders.put({
        productId: appleId,
        date,
        userId: johnId,
        age: 2,
        id,
      });
      const res = await Orders.using("userids").query({
        productId: appleId,
        date,
      });
      expect(res.Items[0].age).toBe(2);

      const res2 = await Orders.using("Users").query({
        userId: johnId,
        age: {
          $gt: 15,
        },
      });

      expect(res2.Items.length).toBe(0);
    });

    it("should not execute query", async () => {
      const input = await Orders.using("Users").query(
        {
          productId: "id-1",
          date: 33,
          userId: "user-1",
        },
        {
          exec: false,
        }
      );
      expect(input).deep.eq({
        TableName: "orders",
        IndexName: "Users",
        KeyConditionExpression: "#n0 = :v1",
        FilterExpression: "(#n2 = :v3) AND (#n4 = :v5)",
        ExpressionAttributeNames: { "#n0": "userId", "#n2": "productId", "#n4": "date" },
        ExpressionAttributeValues: {
          ":v1": { S: "user-1" },
          ":v3": { S: "id-1" },
          ":v5": { N: "33" },
        },
      });
    });

    it("GSI", async () => {
      const id = "dddd";
      const date = new Date("2023-07-20").getTime();
      await Orders.put({
        productId: appleId,
        date,
        userId: saraId,
        age: 18,
        id,
      });
      const res = await Orders.using("Users").query({
        userId: saraId,
      });

      expect(res.Items[0].age).toBe(18);

      // @ts-expect-error
      expect(res.Items[0].id).toBe(undefined);
    });

    it("should query with select filter", async () => {
      const productId = randomUUID();

      await Orders.put({
        productId,
        date: new Date("2023-07-20").getTime(),
        userId: saraId,
        age: 18,
        id: "anything",
      });

      const res = await Orders.using("Users").query(
        {
          userId: saraId,

          productId,
        },
        { Select: ["productId"] }
      );
      expect(res.Items).deep.eq([{ productId }]);
    });

    it("should query with project 'KEYS' config", async () => {
      const id = "dddd";
      const date = new Date("2023-08-28").getTime();
      const city = "Paris";
      await Orders.put({
        productId: appleId,
        date,
        userId: johnId,
        age: 18,
        id,
        city,
      });

      const { Items } = await Orders.using("cities").query({
        productId: appleId,
        date,
      });

      expect(Items).deep.eq([
        {
          date,
          productId: appleId,
          city: "Paris",
        },
      ]);
    });

    it("should find with scan", async () => {
      const id = "dddd";
      const date = new Date("2023-08-28").getTime();
      const city = "Paris";
      await Orders.put({
        productId: appleId,
        date,
        userId: johnId,
        age: 93,
        id,
        city,
      });

      const res = await Orders.using("Users").scan({ age: 93 });
      expect(res.Items.length).toBe(1);
    });

    it("should find with scan with $startsWith", async () => {
      const id = "dddd";
      const date = new Date("2023-08-28").getTime();
      const city = "New York";
      await Orders.put({
        productId: appleId,
        date,
        userId: johnId,
        age: 102,
        id,
        city,
      });

      const res = await Orders.using("cities").scan({
        city: {
          $startsWith: "New ",
        },
      });
      expect(res.Items.length).toBe(1);
    });

    it("should scan with complexe conditions", async () => {
      const date = new Date("2023-08-28").getTime();
      const city = "Washington";
      await Orders.put({
        productId: appleId,
        date,
        userId: johnId,
        age: 108,
        city,
      });
      await Orders.put({
        productId: orangeId,
        date,
        userId: saraId,
        age: 104,
        city,
      });

      const res = await Orders.using("userids").scan({
        city: {
          $startsWith: "Wa",
        },

        $or: [
          {
            $and: [
              {
                userId: saraId,
                age: 104,
              },
            ],
          },
          {
            // same as $and but with different syntax
            userId: johnId,
            age: 12,
          },
        ],
      });
      expect(res.Items.length).toBe(1);
      expect(res.Items[0].userId).toBe(saraId);
    });

    it("scan with select filter", async () => {
      const res = await Orders.using("Users").scan(
        {
          city: {
            $exists: false,
          },
        },
        { Select: ["productId"] }
      );

      expect(Object.keys(res.Items[0]).length).toBe(1);
    });

    it("should not execute scan", async () => {
      const input = await Orders.using("Users").scan(
        {
          city: {
            $exists: false,
          },
          date: {
            $not: {
              $between: [23, 234],
            },
          },
        },
        { Select: ["productId", "age"], exec: false }
      );

      expect(input).deep.eq({
        TableName: "orders",
        IndexName: "Users",
        FilterExpression: "(attribute_not_exists(#n0)) AND (NOT (#n1 BETWEEN :v2 AND :v3))",
        ExpressionAttributeNames: { "#n0": "city", "#n1": "date", "#n4": "productId", "#n5": "age" },
        ExpressionAttributeValues: { ":v2": { N: "23" }, ":v3": { N: "234" } },
        ProjectionExpression: "#n4, #n5",
      });
    });

    it("should throw an error when using not projected attribute in query in filter expression", async () => {
      expect(async () => {
        await Orders.using("Users").query({
          userId: johnId,

          // @ts-expect-error
          city: {
            $exists: false,
          },
        });
      }).rejects.toThrowError();
    });

    it("should throw an error when using not projected attribute in query select expression", async () => {
      expect(async () => {
        await Orders.using("Users").query(
          {
            userId: johnId,
          },
          {
            // @ts-expect-error
            Select: ["city"],
          }
        );
      }).rejects.toThrowError();
    });

    it("should work with Date type", async () => {
      await Orders.put({ date: Date.now(), productId: "1234", userId: "abc", birthday: new Date("2047"), city: "Paris", age: 3 });

      const { Item } = await Orders.put({ date: Date.now(), productId: "1234", userId: "abc", birthday: new Date("1928"), city: "New York" });

      expect(new Date(Item.birthday)).deep.eq(new Date("1928"));

      const { Items } = await Orders.using("bday").scan({ $or: [{ birthday: { $lt: "1945" } }, { city: { $startsWith: "P" }, age: { $exists: false } }] }, { Select: ["city"] });

      expect(Items).deep.eq([
        {
          city: "New York",
        },
      ]);
    });
  });
});
