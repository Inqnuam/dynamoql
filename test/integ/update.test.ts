import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { DynamoQLForbiddenOperationException } from "../../dist";
import { DynamoQLInvalidTypeException } from "../../dist";
import { Players, Player } from "./models/players";
import { describe, beforeAll, afterAll, it, expect, beforeEach, TestContext as ctx } from "vitest";
declare module "vitest" {
  // @ts-ignore
  export interface TestContext extends ctx {
    playerId: string;
  }
}

const newPlayer: Player = {
  firstname: "  Serena",
  lastname: "williams",
  age: 8,
  sex: "F",
  isNew: true,
  // oooooooooo: "invalid field",
  himar: {
    tapor: 5,
  },
  data: {
    anotherTrimmableFields: "      Hello World     ",
    nested: {
      bobo: {
        toto: {
          lolo: 8,
          vaxarsham: ["manuk", "Arkadi"],
        },
        city: "Malaga",
      },

      // @ts-ignore
      dontTakeme: "im sad :(",
    },
    rank: 2,
    last: [145, 6],
  },
  last: 7,
  resultsBySport: {
    tennis: 6,

    // @ts-ignore
    thisAsAn: "Undeclared field!!!",
    football: 45,
  },
  items: [],
  cars: new Set(["BMW", "Audi", "Ferrari"]),
  image: Buffer.from("image:png"),
  retired: false,
  champion: null,
};

const originalObj = JSON.stringify(newPlayer);

const increaseAgeBy10 = {
  age: {
    $incr: 10,
  },
};

const returnAllNew = { ReturnValues: "ALL_NEW" } as const;

describe("Test update operations", () => {
  beforeAll(async () => {
    try {
      await Players.table.delete();
    } catch (error) {}

    await Players.table.create();
  });

  beforeEach(async (ctx) => {
    // @ts-ignore
    const createdPlayer = await Players.put(newPlayer, undefined, { returnCreatedItem: true });
    ctx.playerId = createdPlayer.Item.id;
    expect(ctx.playerId).to.be.a("string");
  });

  afterAll(async () => {
    expect(originalObj).toBe(JSON.stringify(newPlayer));
    try {
      await Players.table.delete();
    } catch (error) {}
  });

  describe("Test update values / operations", () => {
    it("should update string", async ({ playerId }) => {
      const updatedPlayer = await Players.update(
        {
          id: playerId,
          firstname: "Serena",
        },
        {
          firstname: "Venus",
        },
        returnAllNew
      );

      expect(updatedPlayer.Attributes.firstname).toBe("Venus");

      const updatedPlayer2 = await Players.update(
        {
          id: playerId,
          firstname: "Venus",
        },
        {
          firstname: { $set: "Serena" },
        },
        returnAllNew
      );

      expect(updatedPlayer2.Attributes.firstname).toBe("Serena");
    });

    it("should update object", async ({ playerId }) => {
      const updatedPlayer = await Players.update(
        {
          id: playerId,
          himar: {
            // @ts-ignore
            $eq: {
              tapor: 5,
            },
          },
        },
        {
          firstname: "Venus",
        },
        returnAllNew
      );

      expect(updatedPlayer.Attributes.firstname).toBe("Venus");
    });

    it("should update object (checking raw cmd)", async ({ playerId }) => {
      const updatedPlayer = await Players.update(
        {
          id: playerId,
          himar: {
            $eq: {
              tapor: 5,
              tarakan: 9,
            },
          },
        },
        {
          firstname: "Venus",
        },
        { exec: false }
      );

      expect(updatedPlayer).deep.eq({
        ConditionExpression: "#n2 = :v3",
        ExpressionAttributeNames: {
          "#n0": "firstname",
          "#n2": "himar",
        },
        ExpressionAttributeValues: {
          ":v1": {
            S: "Venus",
          },
          ":v3": {
            M: {
              tapor: {
                N: "5",
              },
              tarakan: {
                N: "9",
              },
            },
          },
        },
        Key: {
          id: {
            S: playerId,
          },
        },
        TableName: "players",
        UpdateExpression: "SET #n0 = :v1",
      });
    });

    it("Add an optionnal attribute with $set", async ({ playerId }) => {
      const updatedPlayer = await Players.update(
        {
          id: playerId,
        },
        {
          $set: {
            kotosh: "455",
          },
        },
        returnAllNew
      );

      expect(updatedPlayer.Attributes?.kotosh).toBe("455");
      expect(updatedPlayer.Attributes.last).toBe(7);
    });

    it("should fail to set top level attribute with wrong value", async ({ playerId }) => {
      expect(async () => {
        await Players.update(
          {
            id: playerId,
          },
          {
            $set: {
              // @ts-expect-error
              kotosh: 455,
            },
          }
        );
      }).rejects.toThrow(DynamoQLInvalidTypeException);
    });

    it("should fail to set top level attribute with invalid attribute path", async ({ playerId }) => {
      expect(async () => {
        await Players.update(
          {
            id: playerId,
          },
          {
            $set: {
              // @ts-expect-error
              invalidAttribute: "some invalid value",
            },
          }
        );
      }).rejects.toThrow(DynamoQLForbiddenOperationException);
    });

    it("Add an optionnal attribute with direct key-value", async ({ playerId }) => {
      const updatedPlayer = await Players.update(
        {
          id: playerId,
        },
        {
          kotosh: "999",
        },
        returnAllNew
      );

      expect(updatedPlayer.Attributes?.kotosh).toBe("999");
      expect(updatedPlayer.Attributes?.last).toBe(7);
    });
    it("Remove single attribute", async ({ playerId }) => {
      const updatedPlayer = await Players.update(
        {
          id: playerId,
        },
        {
          $remove: "age",
        },
        returnAllNew
      );

      expect(updatedPlayer.Attributes?.age).toBe(undefined);
    });
    it("Remove multiple attributes", async ({ playerId }) => {
      const updatedPlayer = await Players.update(
        {
          id: playerId,
        },
        {
          $remove: ["age", "image"],
        },
        returnAllNew
      );

      expect(updatedPlayer.Attributes?.age).toBe(undefined);
      expect(updatedPlayer.Attributes?.image).toBe(undefined);
    });
    it("Full Update nested object with", async ({ playerId }) => {
      const updatedPlayer = await Players.update(
        {
          id: playerId,
        },
        {
          resultsBySport: {
            $set: {
              tennis: 784,
            },
          },
        },
        returnAllNew
      );

      expect(updatedPlayer.Attributes?.resultsBySport).deep.eq({
        tennis: 784,
      });
    });

    it("Partial update of nested object", async ({ playerId }) => {
      // HERE
      const updatedPlayer = await Players.update(
        {
          id: playerId,
        },
        {
          resultsBySport: {
            tennis: 63,
          },

          data: {
            nested: {
              bobo: {
                toto: {
                  vaxarsham: ["6"],
                },
              },
            },
          },
        },
        returnAllNew
      );

      expect(updatedPlayer.Attributes?.resultsBySport).deep.eq({
        football: 45,
        tennis: 63,
      });
      expect(updatedPlayer.Attributes?.data.nested.bobo.toto).deep.eq({ vaxarsham: ["6"], lolo: 8 });
    });
    describe("Test numeric update expressions", () => {
      it("should update number (SET)", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            firstname: "Serena",
          },
          {
            age: 36,
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.age).toBe(36);

        const updatedPlayer2 = await Players.update(
          {
            id: playerId,
            firstname: "Serena",
            age: 36,
          },
          {
            age: {
              $set: 45,
            },
          },
          returnAllNew
        );

        expect(updatedPlayer2.Attributes.age).toBe(45);
      });

      it("should update increase number", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            firstname: "Serena",
          },
          increaseAgeBy10,
          returnAllNew
        );

        expect(updatedPlayer.Attributes.age).toBe(18);
      });

      it("should update decrese number", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            firstname: "Serena",
          },
          {
            age: {
              $decr: 4,
            },
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.age).toBe(4);
      });
    });

    describe("Test Array update expressions", () => {
      it("should replace existing array by new array with direct key-value", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
          },
          {
            items: ["phone", "car"],
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.items).deep.eq(["phone", "car"]);
      });
      it("$set - should replace existing array by new array with $set keyword", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
          },
          {
            items: { $set: ["phone", "car"] },
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.items).deep.eq(["phone", "car"]);
      });

      it("should update item in array by index", async ({ playerId }) => {
        await Players.update(
          {
            id: playerId,
          },
          {
            items: ["phone", "car"],
          },
          returnAllNew
        );
        const updatedPlayer = await Players.update(
          { id: playerId },
          {
            "items[0]": {
              $set: "horse",
            },
          },
          returnAllNew
        );
        expect(updatedPlayer.Attributes.items).deep.eq(["horse", "car"]);

        const updatedPlayer2 = await Players.update(
          { id: playerId },
          {
            items: {
              "[0]": "phone",
            },
          },
          returnAllNew
        );
        expect(updatedPlayer2.Attributes.items).deep.eq(["phone", "car"]);
      });
      it("should update multiple items in array by indices", async ({ playerId }) => {
        await Players.update(
          {
            id: playerId,
          },
          {
            items: ["phone", "car"],
          },
          returnAllNew
        );
        const updatedPlayer = await Players.update(
          { id: playerId },
          {
            "items[0]": "horse",
            "items[1]": "phone",
          },
          returnAllNew
        );
        expect(updatedPlayer.Attributes.items).deep.eq(["horse", "phone"]);
      });

      it("should update array nested item", async ({ playerId }) => {
        await Players.update(
          {
            id: playerId,
          },
          {
            matrix: [{ name: "item 0", value: "value 0" }],
          },
          returnAllNew
        );
        const updatedPlayer = await Players.update(
          { id: playerId },
          {
            "matrix[0].value": "updated done",
          },
          returnAllNew
        );
        expect(updatedPlayer.Attributes.matrix).deep.eq([{ name: "item 0", value: "updated done" }]);
      });
      it("$push - should add new item to array", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
          },
          {
            items: {
              $push: "horse",
            },

            "matrix[0]": {},
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.items).deep.eq(["horse"]);
      });
      it("$push - should add multiple items to array", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
          },
          {
            items: {
              $push: ["horse", "phone"],
            },
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.items).deep.eq(["horse", "phone"]);
      });

      it("$push - should crash when pushed item is not a valid item", async ({ playerId }) => {
        await expect(async () => {
          await Players.update(
            {
              id: playerId,
            },
            {
              items: {
                // @ts-expect-error
                $push: ["horse", 435435],
              },
            },
            returnAllNew
          );
        }).rejects.toThrowError();
      });

      it("$unshift - should crash when unshifted item is not a valid item", async ({ playerId }) => {
        await expect(async () => {
          await Players.update(
            {
              id: playerId,
            },
            {
              items: {
                // @ts-expect-error
                $unshift: [435435, { hello: "world" }],
              },
            }
          );
        }).rejects.toThrowError();
      });

      it("should crash when multiple operations are used with same path target ($push AND $set)", async ({ playerId }) => {
        await expect(async () => {
          //  @ts-expect-error
          await Players.update(
            {
              id: playerId,
            },
            {
              items: {
                $push: ["horse", "phone"],
                $unshift: ["horse"],
              },
            }
          );
        }).rejects.toThrowError();
      });

      it("$unshift - should add new item to the beginning of an array ", async ({ playerId }) => {
        await Players.update(
          {
            id: playerId,
          },
          {
            items: ["car"],
          }
        );

        const updatedPlayer = await Players.update(
          {
            id: playerId,
          },
          {
            items: {
              $unshift: "phone",
            },
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.items).deep.eq(["phone", "car"]);
      });

      it("$unshift - should add multtple items to the beginning of an array ", async ({ playerId }) => {
        await Players.update(
          {
            id: playerId,
          },
          {
            items: ["car"],
          }
        );

        const updatedPlayer = await Players.update(
          {
            id: playerId,
          },
          {
            items: {
              $unshift: ["horse", "phone"],
            },
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.items).deep.eq(["horse", "phone", "car"]);
      });

      it("$remove", async ({ playerId }) => {
        await Players.update(
          {
            id: playerId,
          },
          {
            items: ["phone", "car", "horse"],
          },
          returnAllNew
        );

        const updatedPlayer = await Players.update(
          { id: playerId },
          {
            items: {
              $remove: 0,
            },
          },
          returnAllNew
        );
        expect(updatedPlayer.Attributes.items).deep.eq(["car", "horse"]);
        const updatedPlayer2 = await Players.update(
          { id: playerId },
          {
            items: {
              $remove: [0, 1],
            },
          },
          returnAllNew
        );
        expect(updatedPlayer2.Attributes.items).deep.eq([]);
      });
    });

    describe("Test Set update expressions", () => {
      it("should replace existing Set by new Set with direct key-value", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
          },
          {
            cars: new Set(["Opel"]),
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.cars).deep.eq(new Set(["Opel"]));
      });

      it("$set - should replace existing Set by new Set with $set keyword", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
          },
          {
            cars: {
              $set: new Set(["Opel"]),
            },
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.cars).deep.eq(new Set(["Opel"]));
      });

      it("should fail to update Set with multiple operations", async ({ playerId }) => {
        await expect(async () => {
          await Players.update(
            {
              id: playerId,
            },
            {
              cars: {
                $set: new Set(["Opel"]),

                // @ts-expect-error
                $add: "new car",
              },
            },
            returnAllNew
          );
        }).rejects.toThrowError();
      });

      it("$add - should add new item to a Set", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
          },
          {
            cars: {
              $add: "Opel",
            },
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.cars).deep.eq(new Set(["BMW", "Audi", "Ferrari", "Opel"]));
      });

      it("$add - should add multiple items to a Set", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
          },
          {
            cars: {
              $add: ["Mercedes", "Opel"],
            },
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.cars).deep.eq(new Set(["BMW", "Audi", "Ferrari", "Mercedes", "Opel"]));
      });

      it("$delete - should delete an item from a Set", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
          },
          {
            cars: {
              $delete: "Ferrari",
            },
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.cars).deep.eq(new Set(["BMW", "Audi"]));
      });

      it("$delete - should delete multiple items from a Set", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
          },
          {
            cars: {
              $delete: ["Ferrari", "Audi"],
            },
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.cars).deep.eq(new Set(["BMW"]));
      });
    });

    describe("Test Binary update expressions", () => {
      it("should replace existing Binary by new Binary with direct key-value", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
          },
          {
            image: Buffer.from("Hello WORLD"),
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.image).deep.eq(Buffer.from("Hello WORLD"));
      });

      it("should update with Binary condition", async ({ playerId }) => {
        await Players.update(
          {
            id: playerId,
          },
          {
            image: Buffer.from("Hello WORLD"),
          }
        );
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            image: {
              $startsWith: Buffer.from("H"),
            },
          },
          {
            image: Buffer.from("Hello WORLD"),
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.image).deep.eq(Buffer.from("Hello WORLD"));
      });

      it("$set - should replace existing Binary by new Binary with $set keyword", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
          },
          {
            image: { $set: Buffer.from("Hello WORLD") },
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.image).deep.eq(Buffer.from("Hello WORLD"));
      });
    });

    describe("Test Boolean update expressions", () => {
      it("should replace existing Boolean with direct key-value", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
          },
          {
            retired: true,
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.retired).eq(true);
        const updatedPlayer2 = await Players.update(
          {
            id: playerId,
          },
          {
            retired: false,
          },
          returnAllNew
        );

        expect(updatedPlayer2.Attributes.retired).eq(false);
      });

      it("$set - should replace existing Boolean by new Boolean with $set keyword", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
          },
          {
            retired: { $set: true },
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.retired).eq(true);

        const updatedPlayer2 = await Players.update(
          {
            id: playerId,
          },
          {
            retired: { $set: false },
          },
          returnAllNew
        );

        expect(updatedPlayer2.Attributes.retired).eq(false);
      });
    });

    describe("Test Null update expressionss", () => {
      it("should remove existing Null attribute then set it back with direct key-value", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
          },
          {
            $remove: "champion",
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.champion).toBeUndefined();
        const updatedPlayer2 = await Players.update(
          {
            id: playerId,
          },
          {
            champion: null,
          },
          returnAllNew
        );

        expect(updatedPlayer2.Attributes.champion).eq(null);
      });

      it("$set - should remove existing Null attribute then set it back with $set keyword", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
          },
          {
            $remove: "champion",
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.champion).toBeUndefined();

        const updatedPlayer2 = await Players.update(
          {
            id: playerId,
          },
          {
            champion: { $set: null },
          },
          returnAllNew
        );

        expect(updatedPlayer2.Attributes.champion).eq(null);
      });
    });

    describe("Test Attribute add/remove (nested) operations", () => {
      it("$remove - should remove an attribute from a nested object (string literal path)", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
          },
          {
            "data.nested.bobo": {
              $remove: "city",
            },
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.data.nested.bobo.city).toBeUndefined();
      });

      it("$remove - should remove an attribute from a nested object (nested object access)", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
          },
          {
            data: {
              nested: {
                bobo: {
                  $remove: "city",
                },
              },
            },
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.data.nested.bobo.city).toBeUndefined();
      });

      it("$remove - should remove multilpe attributes from a nested object (nested object access)", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
          },
          {
            data: {
              nested: {
                bobo: {
                  $remove: ["city", "toto"],
                },
              },
            },
          },
          returnAllNew
        );

        expect(updatedPlayer.Attributes.data.nested.bobo).deep.eq({});
      });
    });
  });

  describe("Test update with conditions", () => {
    it("Should update with direct key-value equality conditions", async ({ playerId }) => {
      const updatedPlayer = await Players.update(
        {
          id: playerId,
          firstname: "Serena",
        },
        increaseAgeBy10,
        returnAllNew
      );

      expect(updatedPlayer.Attributes?.age).toBe(18);
    });

    it("Should update with $eq conditions", async ({ playerId }) => {
      const updatedPlayer = await Players.update(
        {
          id: playerId,
          firstname: {
            $eq: "Serena",
          },
        },
        increaseAgeBy10,
        returnAllNew
      );

      expect(updatedPlayer.Attributes?.age).toBe(18);
    });

    it("Should update with $between (string) conditions", async ({ playerId }) => {
      const updatedPlayer = await Players.update(
        {
          id: playerId,
          firstname: {
            $between: ["Seren", "Serenab"],
          },
        },
        increaseAgeBy10,
        returnAllNew
      );

      expect(updatedPlayer.Attributes?.age).toBe(18);
    });

    it("Should not update with falsy $between (string) conditions", async ({ playerId }) => {
      await expect(async () => {
        await Players.update(
          {
            id: playerId,
            firstname: {
              $between: ["Serenb", "Serenap"],
            },
          },
          increaseAgeBy10,
          returnAllNew
        );
      }).rejects.toThrowError();
    });

    it("Should update with $between (string) conditions", async ({ playerId }) => {
      const updatedPlayer = await Players.update(
        {
          id: playerId,
          firstname: {
            $in: ["Serena", "Serenab", { hello: "WORLD" }],
          },
        },
        increaseAgeBy10,
        returnAllNew
      );

      expect(updatedPlayer.Attributes?.age).toBe(18);
    });

    it("Should update with $startsWith conditions", async ({ playerId }) => {
      const updatedPlayer = await Players.update(
        {
          id: playerId,
          firstname: {
            $startsWith: "Serena",
          },
        },
        {
          age: {
            $incr: 10,
          },
          sex: "M",
        },
        returnAllNew
      );

      expect(updatedPlayer.Attributes?.age).toBe(18);
    });
    it("Should update with $not $startsWith conditions", async ({ playerId }) => {
      const updatedPlayer = await Players.update(
        {
          id: playerId,
          firstname: {
            $not: {
              $startsWith: "Novak",
            },
          },
        },
        increaseAgeBy10,
        returnAllNew
      );

      expect(updatedPlayer.Attributes?.age).toBe(18);
    });

    it("Should update with $neq conditions", async ({ playerId }) => {
      const updatedPlayer = await Players.update(
        {
          id: playerId,
          lastname: {
            $neq: "Nalbandian",
          },
        },
        increaseAgeBy10,
        returnAllNew
      );

      expect(updatedPlayer.Attributes?.age).toBe(18);
    });

    it("Should update with $type conditions", async ({ playerId }) => {
      const updatedPlayer = await Players.update(
        {
          id: playerId,
          lastname: {
            $type: String,
          },
        },
        increaseAgeBy10,
        returnAllNew
      );

      expect(updatedPlayer.Attributes?.age).toBe(18);
    });

    it("crash $type", async ({ playerId }) => {
      await expect(async () => {
        await Players.update(
          {
            id: playerId,
            firstname: {
              $type: Number,
            },
          },
          increaseAgeBy10
        );
      }).rejects.toThrowError();
    });

    describe("Should update with $size (string lengths) conditions", () => {
      it("$gt", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            firstname: {
              $size: {
                $gt: 5,
              },
            },
          },
          increaseAgeBy10,
          returnAllNew
        );

        expect(updatedPlayer.Attributes?.age).toBe(18);
      });

      it("$gte", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            firstname: {
              $size: {
                $gte: 6,
              },
            },
          },
          increaseAgeBy10,
          returnAllNew
        );

        expect(updatedPlayer.Attributes?.age).toBe(18);
      });

      it("crash $gte", async ({ playerId }) => {
        await expect(async () => {
          await Players.update(
            {
              id: playerId,
              firstname: {
                $size: {
                  $gte: 7,
                },
              },
            },
            increaseAgeBy10,
            returnAllNew
          );
        }).rejects.toThrowError();
      });

      it("$eq", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            firstname: {
              $size: {
                $eq: 6,
              },
            },
          },
          increaseAgeBy10,
          returnAllNew
        );

        expect(updatedPlayer.Attributes?.age).toBe(18);
      });

      it("crash $eq", async ({ playerId }) => {
        await expect(async () => {
          await Players.update(
            {
              id: playerId,
              firstname: {
                $size: {
                  $eq: 2,
                },
              },
            },
            increaseAgeBy10,
            returnAllNew
          );
        }).rejects.toThrowError();
      });

      it("$neq", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            firstname: {
              $size: {
                $neq: 2,
              },
            },
          },
          increaseAgeBy10,
          returnAllNew
        );

        expect(updatedPlayer.Attributes?.age).toBe(18);
      });
      it("crash $neq", async ({ playerId }) => {
        await expect(async () => {
          await Players.update(
            {
              id: playerId,
              firstname: {
                $size: {
                  $neq: 6,
                },
              },
            },
            increaseAgeBy10,
            returnAllNew
          );
        }).rejects.toThrowError();
      });

      it("direct '$size: value' equality", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            firstname: {
              $size: 6,
            },
          },
          increaseAgeBy10,
          returnAllNew
        );

        expect(updatedPlayer.Attributes?.age).toBe(18);
      });

      it("crash direct '$size: value' equality", async ({ playerId }) => {
        await expect(async () => {
          await Players.update(
            {
              id: playerId,
              firstname: {
                $size: 89,
              },
            },
            increaseAgeBy10,
            returnAllNew
          );
        }).rejects.toThrowError();
      });
      it("$not $size $gt", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            firstname: {
              $not: {
                $size: {
                  $gt: 18,
                },
              },
            },
          },
          increaseAgeBy10,
          returnAllNew
        );

        expect(updatedPlayer.Attributes?.age).toBe(18);
      });
      it("crash direct '$size: value' equality", async ({ playerId }) => {
        await expect(async () => {
          await Players.update(
            {
              id: playerId,
              firstname: {
                $not: {
                  $size: {
                    $gt: 3,
                  },
                },
              },
            },
            increaseAgeBy10
          );
        }).rejects.toThrowError();
      });
      it("$between", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            age: {
              $between: [0, 10],
            },
            firstname: {
              $size: {
                $gt: 5,
              },
            },
          },
          increaseAgeBy10,
          returnAllNew
        );

        expect(updatedPlayer.Attributes?.age).toBe(18);
      });
    });

    describe("Should update number with numeric operations", () => {
      it("direct key-value equality", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            age: 8,
          },
          increaseAgeBy10,
          returnAllNew
        );

        expect(updatedPlayer.Attributes?.age).toBe(18);
      });
      it("$eq", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            age: {
              $eq: 8,
            },
          },
          increaseAgeBy10,
          returnAllNew
        );

        expect(updatedPlayer.Attributes?.age).toBe(18);
      });

      it("crash $eq", async ({ playerId }) => {
        await expect(async () => {
          await Players.update(
            {
              id: playerId,
              age: {
                $eq: 28,
              },
            },
            increaseAgeBy10
          );
        }).rejects.toThrowError();
      });
      it("$gt", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            age: {
              $gt: 6,
            },
          },
          increaseAgeBy10,
          returnAllNew
        );

        expect(updatedPlayer.Attributes?.age).toBe(18);
      });

      it("crash $gt", async ({ playerId }) => {
        await expect(async () => {
          await Players.update(
            {
              id: playerId,
              age: {
                $gt: 28,
              },
            },
            increaseAgeBy10
          );
        }).rejects.toThrowError();
      });

      it("$neq", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            age: {
              $neq: 4,
            },
          },
          increaseAgeBy10,
          returnAllNew
        );

        expect(updatedPlayer.Attributes?.age).toBe(18);
      });

      it("crash $neq", async ({ playerId }) => {
        await expect(async () => {
          await Players.update(
            {
              id: playerId,
              age: {
                $neq: 8,
              },
            },
            increaseAgeBy10
          );
        }).rejects.toThrowError();
      });

      it("$between", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            age: {
              $between: [6, 13],
            },
          },
          increaseAgeBy10,
          returnAllNew
        );

        expect(updatedPlayer.Attributes?.age).toBe(18);
      });

      it("crash $between", async ({ playerId }) => {
        await expect(async () => {
          await Players.update(
            {
              id: playerId,
              age: {
                $between: [92, 130],
              },
            },
            increaseAgeBy10
          );
        }).rejects.toThrowError();
      });

      it("$not $gt", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            age: {
              $not: {
                $gt: 16,
              },
            },
          },
          increaseAgeBy10,
          returnAllNew
        );

        expect(updatedPlayer.Attributes?.age).toBe(18);
      });

      it("crash $not $gt", async ({ playerId }) => {
        await expect(async () => {
          await Players.update(
            {
              id: playerId,
              age: {
                $not: {
                  $gt: 4,
                },
              },
            },
            increaseAgeBy10
          );
        }).rejects.toThrowError();
      });

      it("$in ss", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            age: {
              $in: [45, 78, 1, 3, 8, 634, "sddsds", { sf: "sdfs" }],
            },
          },
          increaseAgeBy10,
          returnAllNew
        );

        expect(updatedPlayer.Attributes?.age).toBe(18);
      });
    });

    it("Should update with nested $between conditions", async ({ playerId }) => {
      const age = 18;
      const updatedPlayer = await Players.update(
        {
          id: playerId,
          data: {
            last: {
              "[1]": {
                $between: [3, 9],
              },
            },
          },
        },
        increaseAgeBy10,
        returnAllNew
      );

      expect(updatedPlayer.Attributes?.age).toBe(age);
    });

    it("should update with deep nested object, array and AND conditions", async ({ playerId }) => {
      const age = 18;
      const updatedPlayer = await Players.update(
        {
          id: playerId,
          data: {
            nested: {
              bobo: {
                toto: {
                  lolo: {
                    $gt: 7,
                  },
                  vaxarsham: {
                    "[1]": {
                      $startsWith: "Ark",
                    },
                  },
                },
              },
            },
          },
        },
        increaseAgeBy10,
        returnAllNew
      );

      expect(updatedPlayer.Attributes?.age).toBe(age);
    });
    it("crash previous", async ({ playerId }) => {
      await expect(async () => {
        await Players.update(
          {
            id: playerId,
            data: {
              nested: {
                bobo: {
                  toto: {
                    lolo: {
                      $gt: 7,
                    },
                    vaxarsham: {
                      "[1]": {
                        $startsWith: "John",
                      },
                    },
                  },
                },
              },
            },
          },
          increaseAgeBy10
        );
      }).rejects.toThrowError();
    });
    it("should update previous test with OR condition instead of AND", async ({ playerId }) => {
      const age = 18;
      const updatedPlayer = await Players.update(
        {
          id: playerId,
          data: {
            nested: {
              bobo: {
                toto: {
                  $or: [
                    {
                      lolo: {
                        $gt: 26,
                      },
                    },
                    {
                      vaxarsham: {
                        "[1]": {
                          $startsWith: "Ark",
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        increaseAgeBy10,
        returnAllNew
      );

      expect(updatedPlayer.Attributes?.age).toBe(age);
    });
    it("crash previous OR test conditions", async ({ playerId }) => {
      await expect(async () => {
        await Players.update(
          {
            id: playerId,
            data: {
              nested: {
                bobo: {
                  toto: {
                    $or: [
                      {
                        lolo: {
                          $gt: 36,
                        },
                      },
                      {
                        vaxarsham: {
                          "[1]": {
                            $startsWith: "John",
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
          increaseAgeBy10,
          returnAllNew
        );
      }).rejects.toThrowError();
    });

    it("About nested object value with string literal property access", async ({ playerId }) => {
      const updatedPlayer = await Players.update(
        {
          id: playerId,
          "himar.tapor": {
            $between: [0, 9],
          },
        },
        increaseAgeBy10,
        returnAllNew
      );

      expect(updatedPlayer.Attributes?.age).toBe(18);
    });

    it("crash previous", async ({ playerId }) => {
      await expect(async () => {
        await Players.update(
          {
            id: playerId,
            "himar.tapor": {
              $between: [10, 12],
            },
          },
          increaseAgeBy10
        );
      }).rejects.toThrowError();
    });

    it("About nested object-array value-index with string literal property access", async ({ playerId }) => {
      const updatedPlayer = await Players.update(
        {
          id: playerId,
          "data.nested.bobo.toto.vaxarsham": {
            "[1]": {
              $startsWith: "Arkadi",
            },
          },
        },
        increaseAgeBy10,
        returnAllNew
      );

      expect(updatedPlayer.Attributes?.age).toBe(18);
    });
    it("crash previous", async ({ playerId }) => {
      await expect(async () => {
        await Players.update(
          {
            id: playerId,
            "data.nested.bobo.toto.vaxarsham": {
              "[1]": {
                $startsWith: "Griqor",
              },
            },
          },
          increaseAgeBy10
        );
      }).rejects.toThrowError();
    });

    it("About nested object-array value-index with string literal[x] property access", async ({ playerId }) => {
      const updatedPlayer = await Players.update(
        {
          id: playerId,
          "data.nested.bobo.toto.vaxarsham[1]": {
            $startsWith: "Arkadi",
          },
        },
        increaseAgeBy10,
        returnAllNew
      );

      expect(updatedPlayer.Attributes?.age).toBe(18);

      // double check
      const updatedPlayer2 = await Players.query({
        id: playerId,
      });

      expect(updatedPlayer2.Items[0].age).toBe(18);
    });

    describe("should update based on Boolean attribute conditions", () => {
      it("equality check (false)", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            retired: false,
          },
          increaseAgeBy10,
          returnAllNew
        );

        expect(updatedPlayer.Attributes?.age).toBe(18);
      });

      it("equality check (true)", async ({ playerId }) => {
        expect(async () => {
          await Players.update(
            {
              id: playerId,
              retired: true,
            },
            increaseAgeBy10
          );
        }).rejects.toThrowError();
      });
    });

    describe("should update based on NULL attribute conditions", () => {
      it("equality check (is null)", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            champion: null,
          },
          increaseAgeBy10,
          returnAllNew
        );

        expect(updatedPlayer.Attributes?.age).toBe(18);
      });

      it("equality check (is not null)", async ({ playerId }) => {
        expect(async () => {
          await Players.update(
            {
              id: playerId,
              // @ts-expect-error
              champion: "some value",
            },
            increaseAgeBy10
          );
        }).rejects.toThrowError();
      });

      it("$exists - true check", async ({ playerId }) => {
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            champion: {
              $exists: true,
            },
          },
          increaseAgeBy10,
          returnAllNew
        );

        expect(updatedPlayer.Attributes?.age).toBe(18);
      });

      it("$exists - false check", async ({ playerId }) => {
        await Players.update({ id: playerId }, { $remove: "champion" });
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            champion: {
              $exists: false,
            },
          },
          increaseAgeBy10,
          returnAllNew
        );

        expect(updatedPlayer.Attributes?.age).toBe(18);
      });

      it("$exists - false AND check", async ({ playerId }) => {
        await Players.update({ id: playerId }, { $remove: "champion" });
        const updatedPlayer = await Players.update(
          {
            id: playerId,
            firstname: {
              $exists: true,
              $type: String,
            },
          },
          increaseAgeBy10,
          returnAllNew
        );

        expect(updatedPlayer.Attributes?.age).toBe(18);
      });
    });
  });

  describe("Test updating with invalid values", () => {
    //

    it("should fail on invalid type on nested string literal path", async ({ playerId }) => {
      await expect(async () => {
        await Players.update(
          {
            id: playerId,
          },
          {
            // @ts-expect-error
            "data.nested.bobo.toto.vaxarsham[5]": 4634, // must be a string
          }
        );
      }).rejects.toThrowError();
    });

    it("should fail on invalid type on nested path", async ({ playerId }) => {
      await expect(async () => {
        await Players.update(
          {
            id: playerId,
          },
          {
            data: {
              nested: {
                bobo: {
                  toto: {
                    vaxarsham: {
                      // @ts-expect-error
                      "[5]": 4653, // must be a string
                    },
                  },
                },
              },
            },
          }
        );
      }).rejects.toThrowError();
    });

    it("should fail on top level path", async ({ playerId }) => {
      await expect(async () => {
        await Players.update(
          {
            id: playerId,
          },
          {
            // @ts-expect-error
            skill: 7, //  age is an enum of 0 | 5 | 10 | 15
          }
        );
      }).rejects.toThrowError();
    });

    it("should fail with $set keyword", async ({ playerId }) => {
      await expect(async () => {
        await Players.update(
          {
            id: playerId,
          },
          {
            skill: {
              // @ts-expect-error
              $set: 65, // age is an enum of 0 | 5 | 10 | 15
            },
          }
        );
      }).rejects.toThrowError();
    });

    it("should fail with $set on undeclared property", async ({ playerId }) => {
      await expect(async () => {
        await Players.update(
          {
            id: playerId,
          },
          {
            data: {
              nested: {
                bobo: {
                  toto: {
                    // @ts-expect-error
                    unknown: {
                      $set: "TAPOR",
                    },
                  },
                },
              },
            },
          }
        );
      }).rejects.toThrowError(DynamoQLInvalidTypeException);
    });

    it("should fail with $set on validation error", async ({ playerId }) => {
      await expect(async () => {
        await Players.update(
          {
            id: playerId,
          },
          {
            data: {
              nested: {
                bobo: {
                  toto: {
                    $set: {
                      lolo: 55,
                      // @ts-expect-error
                      vaxarsham: [354353],
                    },
                  },
                },
              },
            },
          }
        );
      }).rejects.toThrowError(DynamoQLInvalidTypeException);
    });

    it("should ignore undeclared fields with $set update keyword", async ({ playerId }) => {
      const { Attributes } = await Players.update(
        {
          id: playerId,
        },
        {
          data: {
            nested: {
              bobo: {
                toto: {
                  $set: {
                    lolo: 55,
                    vaxarsham: [""],
                    // @ts-expect-error
                    unkownField: { hello: "WORLD" },
                  },
                },
              },
            },
          },
        },
        {
          ReturnValues: "UPDATED_NEW",
        }
      );

      expect(Attributes.data.nested.bobo.toto).deep.eq({ lolo: 55, vaxarsham: [""] });
    });

    it("should fail when trying to remove a required attribute", async ({ playerId }) => {
      await expect(async () => {
        await Players.update(
          {
            id: playerId,
          },
          {
            data: {
              nested: {
                bobo: {
                  toto: {
                    // @ts-expect-error
                    $remove: "lolo",
                  },
                },
              },
            },
          }
        );
      }).rejects.toThrowError(DynamoQLForbiddenOperationException);
    });

    it("should fail when trying to increase an enum number", async ({ playerId }) => {
      await expect(async () => {
        await Players.update(
          {
            id: playerId,
          },
          {
            skill: {
              // @ts-expect-error
              $incr: 5,
            },
          }
        );
      }).rejects.toThrowError(DynamoQLForbiddenOperationException);
    });

    it("should fail when trying to decrease an enum number", async ({ playerId }) => {
      await expect(async () => {
        await Players.update(
          {
            id: playerId,
          },
          {
            skill: {
              // @ts-expect-error
              $decr: 5,
            },
          }
        );
      }).rejects.toThrowError(DynamoQLForbiddenOperationException);
    });
  });

  describe("Test Date operations", () => {
    it("should set Date with $set keyword", async ({ playerId }) => {
      const date = new Date();
      await Players.update({ id: playerId }, { register: { $set: date } });

      const { Item } = await Players.get({ id: playerId });
      expect(Item.register).deep.eq(date);
    });

    it("should set Date with with direct assign", async ({ playerId }) => {
      const date = new Date();
      await Players.update({ id: playerId }, { register: date });

      const { Item } = await Players.get({ id: playerId });
      expect(Item.register).deep.eq(date);
    });

    it("should increase Date year", async ({ playerId }) => {
      const date = new Date("2022-01-01T00:00:00.000Z");
      await Players.update({ id: playerId }, { register: date });
      await Players.update({ id: playerId }, { register: { $date: { year: { $incr: 1 } } } });

      const { Item } = await Players.get({ id: playerId });
      expect(Item.register.getFullYear()).eq(2023);
    });

    it("should set date value with epoch format", async ({ playerId }) => {
      //

      const date = new Date();
      const ttl = date.getTime() / 1000;
      await Players.update({ id: playerId }, { ttl });

      const { Item } = await Players.get({ id: playerId }, { Select: ["ttl"] });

      expect(Math.floor(Item.ttl.getTime() / 1000)).deep.eq(Math.floor(ttl));
    });

    it("should fail to direct assign date with invalid date", async ({ playerId }) => {
      expect(async () => {
        await Players.update({ id: playerId }, { ttl: "invalid date" });
      }).rejects.toThrow(DynamoQLInvalidTypeException);
    });

    it("should fail to $set date with invalid date", async ({ playerId }) => {
      expect(async () => {
        await Players.update({ id: playerId }, { ttl: { $set: "invalid date" } });
      }).rejects.toThrow(DynamoQLInvalidTypeException);
    });

    it("should update depending on Date condition (exists)", async ({ playerId }) => {
      await Players.update({ id: playerId }, { $remove: "champion" });

      const registerDate = new Date();
      const updatedPlayer = await Players.update(
        {
          id: playerId,

          ttl: {
            $exists: false,
          },
        },
        {
          register: registerDate,
        },
        { ReturnValues: "UPDATED_NEW" }
      );

      expect(updatedPlayer.Attributes?.register).deep.eq(registerDate);
    });

    it("should update depending on Date condition (equal)", async ({ playerId }) => {
      const oldDate = new Date();
      await Players.update(
        {
          id: playerId,
        },
        {
          register: oldDate,
        }
      );

      const registerDate = new Date();
      const updatedPlayer = await Players.update(
        {
          id: playerId,
          register: oldDate,
        },
        {
          register: registerDate,
        },
        { ReturnValues: "UPDATED_NEW" }
      );

      expect(updatedPlayer.Attributes?.register).deep.eq(registerDate);
    });

    it("should update depending on Date condition (less)", async ({ playerId }) => {
      const oldDate = new Date();
      await Players.update(
        {
          id: playerId,
        },
        {
          register: oldDate,
        }
      );

      const registerDate = new Date();
      const updatedPlayer = await Players.update(
        {
          id: playerId,
          register: {
            $lt: new Date(),
          },
        },
        {
          register: registerDate,
        },
        { ReturnValues: "UPDATED_NEW" }
      );

      expect(updatedPlayer.Attributes?.register).deep.eq(registerDate);
    });

    it("should update depending on Date condition (between)", async ({ playerId }) => {
      const oldDate = new Date();
      await Players.update(
        {
          id: playerId,
        },
        {
          register: oldDate,
        }
      );

      const registerDate = new Date();
      const updatedPlayer = await Players.update(
        {
          id: playerId,
          register: {
            $between: [new Date("1918"), "2028"],
          },
        },
        {
          register: registerDate,
        },
        { ReturnValues: "UPDATED_NEW" }
      );

      expect(updatedPlayer.Attributes?.register).deep.eq(registerDate);
    });

    it("should fail to update depending on Date condition", async ({ playerId }) => {
      const oldDate = new Date();
      await Players.update(
        {
          id: playerId,
        },
        {
          register: oldDate,
        }
      );

      const registerDate = new Date();
      expect(async () => {
        await Players.update(
          {
            id: playerId,
            register: {
              $gt: new Date(),
            },
          },
          {
            register: registerDate,
          },
          { ReturnValues: "UPDATED_NEW" }
        );
      }).rejects.toThrow(ConditionalCheckFailedException);
    });

    it("should convert valid date to number when updating", async ({ playerId }) => {
      const registerDate = new Date();

      const greaterDate = new Date("2038");
      const lesserDate = new Date("1943");
      const res = await Players.update(
        {
          id: playerId,
          $or: [
            {
              register: {
                $gt: greaterDate,
              },
            },
            {
              register: {
                $lte: "1943",
              },
            },
          ],
        },
        {
          register: registerDate,
        },
        { ReturnValues: "UPDATED_NEW", exec: false }
      );

      expect(res).deep.eq({
        ReturnValues: "UPDATED_NEW",
        TableName: Players.table.name,
        Key: { id: { S: playerId } },
        UpdateExpression: "SET #n0 = :v1",
        ConditionExpression: "(#n0 > :v2) OR (#n0 <= :v3)",
        ExpressionAttributeNames: { "#n0": "register" },
        ExpressionAttributeValues: { ":v1": { N: `${registerDate.getTime()}` }, ":v2": { N: `${greaterDate.getTime()}` }, ":v3": { N: `${lesserDate.getTime()}` } },
      });
    });

    it("should set Set<Date>", async ({ playerId }) => {
      const date = new Date();

      const input = await Players.update(
        {
          id: playerId,

          events: {
            $not: {
              $type: {
                type: Set,
                items: Date,
              },
            },
          },
        },
        { events: new Set([date]) }
      );

      const { Item } = await Players.get({ id: playerId });
      expect(Item.events).deep.eq(new Set([date]));
    });
  });

  describe("Test provided options", () => {
    it("should not execute", async ({ playerId }) => {
      const res = await Players.update(
        {
          id: playerId,
        },
        {
          data: {
            nested: {
              bobo: {
                $remove: "city",
              },
            },
          },
        },
        {
          exec: false,
        }
      );

      expect(res).deep.eq({
        TableName: "players",
        Key: { id: { S: playerId } },
        UpdateExpression: "REMOVE #n0.#n1.#n2.#n3",
        ExpressionAttributeNames: { "#n0": "data", "#n1": "nested", "#n2": "bobo", "#n3": "city" },
      });
    });
  });
});
