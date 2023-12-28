import { describe, beforeAll, it, expect } from "vitest";
import { CustomersTr } from "./models/customersTr";
import { randomUUID } from "crypto";
import { TransactionCanceledException } from "@aws-sdk/client-dynamodb";

const rawTransactInput = {
  TransactItems: [
    {
      ConditionCheck: {
        ConditionExpression: "contains(#n0, :v1)",
        ExpressionAttributeNames: {
          "#n0": "lastname",
        },
        ExpressionAttributeValues: {
          ":v1": {
            S: "xxx",
          },
        },
        Key: {
          id: {
            S: "some-id",
          },
        },

        TableName: CustomersTr.table.name,
      },
    },
    {
      Put: {
        ConditionExpression: "attribute_not_exists(#n0.#n1)",
        ExpressionAttributeNames: {
          "#n0": "address",
          "#n1": "zip",
        },
        Item: {
          firstname: {
            S: "John",
          },
          id: {
            S: "some-id-4",
          },
          lastname: {
            S: "Doe!",
          },
        },

        TableName: CustomersTr.table.name,
      },
    },
    {
      Delete: {
        ConditionExpression: "#n0 = :v1",
        ExpressionAttributeNames: {
          "#n0": "lastname",
        },
        ExpressionAttributeValues: {
          ":v1": {
            S: "Do not",
          },
        },
        Key: {
          id: {
            S: "some-id-3",
          },
        },

        TableName: CustomersTr.table.name,
      },
    },
    {
      Update: {
        ConditionExpression: "#n0 = :v2",
        ExpressionAttributeNames: {
          "#n0": "lastname",
        },
        ExpressionAttributeValues: {
          ":v1": {
            S: "Doe!",
          },
          ":v2": {
            S: "Do not",
          },
        },
        Key: {
          id: {
            S: "some-id-2",
          },
        },
        ReturnValuesOnConditionCheckFailure: "ALL_OLD",
        TableName: CustomersTr.table.name,
        UpdateExpression: "SET #n0 = :v1",
      },
    },
  ],
};

describe("Transaction", () => {
  beforeAll(async () => {
    try {
      await CustomersTr.table.delete();
    } catch (error) {}

    await CustomersTr.table.create();
  });

  it("should get transact Items unmarshalled and apply getters and select filter", async () => {
    const { Item: CreatedItem } = await CustomersTr.put({
      firstname: "user-1",
      lastname: "user-1",
      dummyData: {
        awsomeWorld: 123,
      },
    });
    const { Items } = await CustomersTr.transactGet([{ id: CreatedItem.id }], { Select: ["dummyData.awsomeWorld"] });

    expect(Items).deep.eq([
      {
        dummyData: { awsomeWorld: 999 },
      },
    ]);
  });
  it("should get transact Items providing ids directly", async () => {
    const { Item: CreatedItem } = await CustomersTr.put({
      firstname: "user-1",
      lastname: "user-1",
      dummyData: {
        awsomeWorld: 123,
      },
    });
    const { Items } = await CustomersTr.transactGet([CreatedItem.id], { Select: ["dummyData.awsomeWorld"] });

    expect(Items).deep.eq([
      {
        dummyData: { awsomeWorld: 999 },
      },
    ]);
  });

  it("should get transact Items provinding select filter separetly for each item", async () => {
    const { Item: CreatedItem } = await CustomersTr.put({
      firstname: "user-1",
      lastname: "user-1",
      dummyData: {
        awsomeWorld: 123,
      },
    });
    const { Items } = await CustomersTr.transactGet([{ $key: { id: CreatedItem.id }, $select: ["dummyData.awsomeWorld"] }]);

    // @ts-expect-error
    Items[0].firstname;
    expect(Items).deep.eq([
      {
        dummyData: { awsomeWorld: 999 },
      },
    ]);
  });

  it("should not execute Transact Get", async () => {
    const res = await CustomersTr.transactGet([{ id: "some id" }], { Select: ["dummyData.awsomeWorld", "orders"], exec: false });

    expect(res).deep.eq({
      TransactItems: [
        {
          Get: {
            TableName: CustomersTr.table.name,
            Key: { id: { S: "some id" } },
            ExpressionAttributeNames: { "#n0": "dummyData", "#n1": "awsomeWorld", "#n2": "orders" },
            ProjectionExpression: "#n0.#n1,#n2",
          },
        },
      ],
    });
  });

  it("should transact Delete and Put", async () => {
    const { Item: CreatedItem } = await CustomersTr.put({ firstname: "Sara", lastname: "Do not" });

    const id = randomUUID();
    await CustomersTr.transactWrite({
      delete: [{ condition: { id: CreatedItem.id, lastname: "Do not" } }],
      put: [{ item: { id, firstname: "John", lastname: "Doe!" }, condition: { "address.zip": { $exists: false } } }],
    });

    const { Item: TransactCreatedItem } = await CustomersTr.get({ id });
    expect(TransactCreatedItem).deep.eq({
      firstname: "John",
      id,
      lastname: "Doe!",
    });

    const { Item: TransactDeletedItem } = await CustomersTr.get({ id: CreatedItem.id });
    expect(TransactDeletedItem).toBeUndefined();
  });

  it("should transact Update", async () => {
    const { Item } = await CustomersTr.put({ firstname: "Sara", lastname: "Do not" });

    await CustomersTr.transactWrite({
      update: [{ condition: { id: Item.id, lastname: "Do not" }, set: { lastname: "Doe!" } }],
    });

    const { Item: TransactUpdatedItem } = await CustomersTr.get({ id: Item.id });
    expect(TransactUpdatedItem).deep.eq({
      firstname: "Sara",
      id: Item.id,
      lastname: "Doe!",
    });
  });

  it("should transact Update with ConditionCheck (success)", async () => {
    const { Item: Checker } = await CustomersTr.put({ firstname: "John", lastname: "Doe" });

    const { Item } = await CustomersTr.put({ firstname: "Sara", lastname: "Do not" });

    await CustomersTr.transactWrite({
      check: [{ condition: { id: Checker.id, lastname: { $includes: "oe" } } }],
      update: [{ condition: { id: Item.id, lastname: "Do not" }, set: { lastname: "Doe!" } }],
    });

    const { Item: TransactUpdatedItem } = await CustomersTr.get({ id: Item.id });
    expect(TransactUpdatedItem).deep.eq({
      firstname: "Sara",
      id: Item.id,
      lastname: "Doe!",
    });
  });

  it("should transact Update with ConditionCheck (failure)", async () => {
    const { Item: Checker } = await CustomersTr.put({ firstname: "John", lastname: "Doe" });

    const { Item } = await CustomersTr.put({ firstname: "Sara", lastname: "Do not" });

    expect(async () => {
      await CustomersTr.transactWrite({
        check: [{ condition: { id: Checker.id, lastname: { $includes: "xxx" } } }],
        update: [{ condition: { id: Item.id, lastname: "Do not" }, set: { lastname: "Doe!" } }],
      });
    }).rejects.toThrow(TransactionCanceledException);
  });

  it("should not execute transact Write", async () => {
    const input = await CustomersTr.transactWrite(
      {
        check: [{ condition: { id: "some-id", lastname: { $includes: "xxx" } } }],
        update: [{ condition: { id: "some-id-2", lastname: "Do not" }, set: { lastname: "Doe!" }, ReturnValuesOnConditionCheckFailure: "ALL_OLD" }],
        delete: [{ condition: { id: "some-id-3", lastname: "Do not" } }],
        put: [{ item: { id: "some-id-4", firstname: "John", lastname: "Doe!" }, condition: { "address.zip": { $exists: false } } }],
      },
      { exec: false }
    );

    expect(input).deep.eq(rawTransactInput);
  });

  it("should transact Delete items (success)", async () => {
    const { Item } = await CustomersTr.put({ firstname: "Sara", lastname: "Do not" });

    await CustomersTr.transactDelete([{ id: Item.id }]);
    const { Item: TransactDeletedItem } = await CustomersTr.get({ id: Item.id });

    expect(TransactDeletedItem).toBeUndefined();
  });

  it("should transact Delete items (with separate condition check)", async () => {
    const { Item } = await CustomersTr.put({ firstname: "Sara", lastname: "Do not" });

    await CustomersTr.put({ id: "check-id", firstname: "Mister", lastname: "Checker" });

    await CustomersTr.transactDelete([{ id: Item.id }], { check: [{ id: "check-id", lastname: "Checker" }] });
    const { Item: TransactDeletedItem } = await CustomersTr.get({ id: Item.id });

    expect(TransactDeletedItem).toBeUndefined();
  });

  it("should fail transact Delete items (with separate condition check)", async () => {
    const { Item } = await CustomersTr.put({ firstname: "Sara", lastname: "Do not" });

    expect(async () => {
      await CustomersTr.transactDelete([{ id: Item.id }], { check: [{ id: "check-id", lastname: "Checkeeeer" }] });
    }).rejects.toThrow();
  });

  it("should transact Delete items (failure - invalid input)", async () => {
    expect(async () => {
      await CustomersTr.transactDelete([
        {
          // @ts-expect-error
          gg: randomUUID(),
        },
      ]);
    }).rejects.toThrow();
  });

  it("should not execute transact Delete", async () => {
    const id = randomUUID();
    const input = await CustomersTr.transactDelete([{ id }], { exec: false, ClientRequestToken: "some-token", ReturnValuesOnConditionCheckFailure: "ALL_OLD" });

    expect(input).deep.eq({
      ClientRequestToken: "some-token",
      TransactItems: [{ Delete: { Key: { id: { S: id } }, TableName: CustomersTr.table.name, ReturnValuesOnConditionCheckFailure: "ALL_OLD" } }],
    });
  });

  it("should transact Put items (success)", async () => {
    const id = randomUUID();

    await CustomersTr.transactPut([{ item: { id: id, firstname: "John", lastname: "Doe" } }]);
    const { Item } = await CustomersTr.get({ id: id });

    expect(Item).deep.eq({
      firstname: "John",
      id,
      lastname: "Doe",
    });
  });

  it("should transact Put items (failure)", async () => {
    const { Item } = await CustomersTr.put({ firstname: "Sara", lastname: "Do not" });

    expect(async () => {
      await CustomersTr.transactPut([
        {
          item: {
            id: Item.id,

            firstname: "John",
            lastname: "Doe",
          },
          condition: {
            firstname: "John",
          },
        },
      ]);
    }).rejects.toThrow(TransactionCanceledException);
  });

  it("should transact Put items (failure on additionnal check condition)", async () => {
    const { Item } = await CustomersTr.put({ firstname: "Sara", lastname: "Do not" });

    const { Item: checker } = await CustomersTr.put({ firstname: "Miss", lastname: "Checker" });

    expect(async () => {
      await CustomersTr.transactPut(
        [
          {
            item: {
              id: Item.id,

              firstname: "John",
              lastname: "Doe",
            },
          },
        ],
        {
          check: [
            {
              id: checker.id,
              firstname: "some firstname",
              lastname: "some lastname",
            },
          ],
        }
      );
    }).rejects.toThrow(TransactionCanceledException);
  });

  it("should transact Put items (success on additionnal check condition)", async () => {
    const { Item: createdItem } = await CustomersTr.put({ firstname: "Sara", lastname: "Do not" });

    const { Item: checker } = await CustomersTr.put({ firstname: "Miss", lastname: "Checker" });

    await CustomersTr.transactPut(
      [
        {
          item: {
            id: createdItem.id,
            firstname: "John",
            lastname: "Doe",
          },
        },
      ],
      {
        check: [
          {
            id: checker.id,
            firstname: "Miss",
            lastname: "Checker",
          },
        ],
      }
    );

    const { Item } = await CustomersTr.get(createdItem.id);

    expect(Item).deep.eq({
      id: createdItem.id,
      firstname: "John",
      lastname: "Doe",
    });
  });

  it("should not execute transact Put", async () => {
    const input = await CustomersTr.transactPut(
      [
        {
          item: { id: "some-id", firstname: "John", lastname: "Doe" },
          condition: { "contact[5].hour.min": { $between: [9, 21] } },
          ReturnValuesOnConditionCheckFailure: "ALL_OLD",
        },
      ],
      {
        exec: false,
        ClientRequestToken: "some-tokenX",

        setterInfo: {
          some: {
            dummy: {
              data: true,
            },
          },
        },
      }
    );

    expect(input).deep.eq({
      ClientRequestToken: "some-tokenX",
      TransactItems: [
        {
          Put: {
            TableName: CustomersTr.table.name,
            Item: { id: { S: "some-id" }, firstname: { S: "John" }, lastname: { S: "Doe" } },
            ConditionExpression: "#n0[5].#n1.#n2 BETWEEN :v3 AND :v4",
            ExpressionAttributeNames: {
              "#n0": "contact",
              "#n1": "hour",
              "#n2": "min",
            },
            ExpressionAttributeValues: {
              ":v3": {
                N: "9",
              },
              ":v4": {
                N: "21",
              },
            },
            ReturnValuesOnConditionCheckFailure: "ALL_OLD",
          },
        },
      ],
    });
  });

  it("should transact Update items (success)", async () => {
    const { Item } = await CustomersTr.put({ firstname: "Sara", lastname: "Do not" });
    const id = Item.id;

    await CustomersTr.transactUpdate([{ condition: { id, lastname: "Do not" }, set: { lastname: "Doe!" } }]);

    const res = await CustomersTr.get({ id });

    expect(res.Item).deep.eq({ id, firstname: "Sara", lastname: "Doe!" });
  });

  it("should transact Update items (failure)", async () => {
    const { Item } = await CustomersTr.put({ firstname: "Sara", lastname: "Do not" });

    expect(async () => {
      await CustomersTr.transactUpdate([{ condition: { id: Item.id, lastname: "wrong name" }, set: { lastname: "Doe!" } }]);
    }).rejects.toThrow(TransactionCanceledException);
  });

  it("should transact Update items (success with check condition)", async () => {
    const { Item } = await CustomersTr.put({ firstname: "Sara", lastname: "Do not" });
    const id = Item.id;

    const { Item: checker } = await CustomersTr.put({ firstname: "mister", lastname: "checker", orders: new Set(["order-1"]) });

    await CustomersTr.transactUpdate([{ condition: { id, lastname: "Do not" }, set: { lastname: "Doe!" } }], {
      check: [
        {
          id: checker.id,
          orders: {
            $includes: "order-1",
          },
        },
      ],
    });

    const res = await CustomersTr.get({ id });

    expect(res.Item).deep.eq({ id, firstname: "Sara", lastname: "Doe!" });
  });

  it("should transact Update items (success with check condition)", async () => {
    const { Item } = await CustomersTr.put({ firstname: "Sara", lastname: "Do not" });
    const id = Item.id;

    const { Item: checker } = await CustomersTr.put({ firstname: "mister", lastname: "checker", orders: new Set(["order-1"]) });

    expect(async () => {
      await CustomersTr.transactUpdate([{ condition: { id, lastname: "Do not" }, set: { lastname: "Doe!" } }], {
        check: [
          {
            id: checker.id,
            orders: {
              $includes: "order-2",
            },
          },
        ],
      });
    }).rejects.toThrow(TransactionCanceledException);
  });

  it("should not execute transact Update", async () => {
    const input = await CustomersTr.transactUpdate(
      [{ condition: { id: "some-id", lastname: "wrong name" }, set: { lastname: "Doe!" }, ReturnValuesOnConditionCheckFailure: "ALL_OLD" }],
      { exec: false }
    );

    expect(input).deep.eq({
      TransactItems: [
        {
          Update: {
            ConditionExpression: "#n0 = :v2",
            ExpressionAttributeNames: {
              "#n0": "lastname",
            },
            ExpressionAttributeValues: {
              ":v1": {
                S: "Doe!",
              },
              ":v2": {
                S: "wrong name",
              },
            },
            Key: {
              id: {
                S: "some-id",
              },
            },
            TableName: CustomersTr.table.name,
            UpdateExpression: "SET #n0 = :v1",
            ReturnValuesOnConditionCheckFailure: "ALL_OLD",
          },
        },
      ],
    });
  });
});
