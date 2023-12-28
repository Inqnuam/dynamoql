import { randomUUID } from "crypto";
import { Users, type User } from "./models/users";
import { describe, beforeAll, it, expect } from "vitest";
import { Person } from "./models/common";

const newPlayer: User = {
  id: "89",
  firstname: "Novak   ",
  lastname: "Djokovic",
  age: 45,
  victories: 1213,
  defeats: 5,
  rank: 1,
  friends: ["Rafel Nadal"],
};

describe("test DDB find operations", () => {
  beforeAll(async () => {
    try {
      await Users.table.delete();
    } catch (error) {}

    await Users.table.create();
  });

  describe("Create items", async () => {
    it("Should create a single item", async () => {
      const { Item: createdUser } = await Users.put(newPlayer);

      expect(createdUser.id).to.be.a("string");
      expect(createdUser.age).to.be.a("number");
    });
  });

  describe("Find Items", () => {
    it("should find items with primary index", async () => {
      const foundUsers = await Users.query({
        id: "89",
      });
      expect(foundUsers.Items).to.be.an("array");
      expect(foundUsers.Items[0]).to.be.an("object");
    });

    it("should find items with primary key", async () => {
      const foundUsers = await Users.query({
        id: "89",
        age: 45,
      });
      expect(foundUsers.Items).to.be.an("array");
      expect(foundUsers.Items[0]).to.be.an("object");
    });

    it("should not find items with invalid primary key", async () => {
      const { Count, Items } = await Users.query({
        id: "89",
        age: 90,
      });

      expect(Count).toBe(0);
      expect(Items.length).toBe(0);
    });

    it("should find items with primary key with conditions on sort key", async () => {
      const foundUsers = await Users.query({
        id: "89",
        age: {
          $gt: 9,
        },
      });
      expect(foundUsers.Items).to.be.an("array");
      expect(foundUsers.Items[0]).to.be.an("object");
    });

    it("should find items with primary key with filter conditions", async () => {
      const foundUsers = await Users.query({
        id: "89",
        age: {
          $gt: 9,
        },
        firstname: {
          $startsWith: "Nov",
        },
      });
      expect(foundUsers.Items).to.be.an("array");
      expect(foundUsers.Items[0]).to.be.an("object");
    });

    it("should not find items with primary key with an invalid filter condition", async () => {
      const { Count, Items } = await Users.query({
        id: "89",
        age: {
          $gt: 9,
        },
        firstname: {
          $startsWith: "raf",
        },
      });
      expect(Count).toBe(0);
      expect(Items.length).toBe(0);
    });

    it("should find items with primary index and with filter conditions", async () => {
      const foundUsers = await Users.query({
        id: "89",
        firstname: {
          $startsWith: "Nov",
        },
        rank: {
          $gte: 0,
        },
      });
      expect(foundUsers.Items).to.be.an("array");
      expect(foundUsers.Items[0]).to.be.an("object");
    });

    it("should find items with primary key and $or conditions", async () => {
      const foundUsers = await Users.query({
        id: "89",
        age: 45,
        $or: [
          {
            rank: 99,
          },
          {
            defeats: {
              $lt: 6,
            },
          },
        ],
      });
      expect(foundUsers.Items).to.be.an("array");
      expect(foundUsers.Items[0]).deep.eq({
        id: "89",
        firstname: "Novak", // trimmed
        lastname: "Djokovic",
        age: 45,
        victories: 1213,
        defeats: 5,
        rank: 1,
        friends: ["Rafel Nadal"],
      });
    });

    it("should find items with primary key and project only selected fields", async () => {
      const { Items } = await Users.query(
        {
          id: "89",
          age: {
            $gt: 9,
          },
          firstname: {
            $startsWith: "Nov",
          },
        },
        { Select: ["victories"] }
      );

      expect(Items).deep.eq([
        {
          victories: 1213,
        },
      ]);
    });

    describe("should return items based on $type condition", () => {
      it("String", async () => {
        const { Items } = await Users.query({
          id: "89",
          firstname: {
            $type: String,
          },
        });

        expect(Items.length).toBe(1);
      });

      it("Array", async () => {
        const { Items } = await Users.query({
          id: "89",
          friends: {
            $type: Array,
          },
        });

        expect(Items.length).toBe(1);
      });

      it("Buffer", async () => {
        const id = randomUUID();
        const age = 11;

        await Users.put({
          id,
          age,
          garbageData: Buffer.from("Hello WORLD"),
        });

        const { Items } = await Users.query(
          {
            id,
            age,
            garbageData: {
              $type: Buffer,
            },
          },
          { Select: ["garbageData"] }
        );

        expect(Items.length).toBe(1);
        expect(Items[0].garbageData).toBeInstanceOf(Buffer);
      });

      it("Invalid type", async () => {
        const { Items } = await Users.query({
          id: "89",
          friends: {
            $type: String,
          },
        });

        expect(Items!.length).toBe(0);
      });
    });
  });

  describe("Find items based on array conditions", () => {
    it("$size condition", async () => {
      const { Items } = await Users.query({
        id: "89",
        friends: {
          $size: {
            $gt: 1,
          },
        },
      });

      expect(Items.length).toBe(0);
    });

    it("OR conditions", async () => {
      const { Items } = await Users.query({
        id: "89",
        friends: {
          $or: [
            {
              $size: {
                $gt: 1,
              },
            },
            {
              "[0]": {
                $startsWith: "Raf",
              },
            },
          ],
        },
      });

      expect(Items!.length).toBe(1);
    });

    it("AND conditions", async () => {
      const { Items } = await Users.query({
        id: "89",
        friends: {
          "[0]": {
            $startsWith: "Raf",
          },
          $size: {
            $lte: 1,
          },
        },
      });

      expect(Items.length).toBe(1);
    });

    it("direct equality condition", async () => {
      const { Items } = await Users.query({
        id: "89",
        friends: ["Rafel Nadal"],
      });

      expect(Items.length).toBe(1);
    });

    it("$eq condition", async () => {
      const { Items } = await Users.query({
        id: "89",
        friends: {
          $eq: ["Rafel Nadal"],
        },
      });

      expect(Items.length).toBe(1);
    });

    it("$includes condition", async () => {
      const { Items } = await Users.query({
        id: "89",
        friends: {
          $includes: "Rafel Nadal",
        },
      });

      expect(Items.length).toBe(1);
    });

    it("throw error on invalid expression", async () => {
      await expect(async () => {
        await Users.query({
          id: "89",
          friends: {
            $includes: "Rafel Nadal",
            $and: [{}],
          },
        });
      }).rejects.toThrowError();
    });

    it("must not throw an error with empty {} on $eq expression", async () => {
      const { Items } = await Users.query({
        id: "89",
        garbageData: { $eq: {} },
      });
      expect(Items.length).toBe(0);
    });
  });

  describe("Test query options", () => {
    it("should not execute", async () => {
      const input = await Users.query(
        {
          id: "89",
          age: 90,
        },
        { exec: false }
      );

      expect(input).deep.eq({
        TableName: "users",
        KeyConditionExpression: "(#n0 = :v1) AND (#n2 = :v3)",
        ExpressionAttributeNames: { "#n0": "id", "#n2": "age" },
        ExpressionAttributeValues: { ":v1": { S: "89" }, ":v3": { N: "90" } },
      });
    });

    it("should not return Items", async () => {
      const res = await Users.query(
        {
          id: "89",
          age: {
            $gt: 9,
          },
        },
        { Select: "COUNT" }
      );

      // @ts-expect-error
      expect(res.Items).toBeUndefined();
    });

    it("should return empty Items array", async () => {
      const res = await Users.query({
        id: "00",
        age: {
          $gt: 99999,
        },
      });

      expect(res.Items).deep.eq([]);
    });
  });

  describe("Test select types", () => {
    it("should return valid attributes", async () => {
      const id = "someplayerid";
      const age = 49;
      const firstname = randomUUID();
      const lastname = randomUUID();
      await Users.put({ id, age, bestFriend: new Person(firstname, lastname) });

      const { Items } = await Users.query({ id, age });

      expect(Items[0].bestFriend.fullname).eq(`${firstname} ${lastname}`);

      const { Items: expilictSelectItems } = await Users.query({ id, age }, { Select: ["bestFriend"] });

      // @ts-expect-error
      expilictSelectItems[0].id;

      expect(expilictSelectItems[0].bestFriend).deep.eq(new Person(firstname, lastname));
    });
  });
});
