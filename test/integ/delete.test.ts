import { Vehicles } from "./models/vehicles";
import { describe, beforeAll, it, expect } from "vitest";
import { randomUUID } from "crypto";
import { Person } from "./models/common";

const image = Buffer.from("Hello World");
const variants: Set<number> = new Set([1, 2]);

const john = new Person("John", "Doe");

describe("Delete Item", () => {
  beforeAll(async () => {
    try {
      await Vehicles.table.delete();
    } catch (error) {}
    await Vehicles.table.create();
  });

  it("should delete", async () => {
    const id = "some random id";
    const year = new Date("2014");
    await Vehicles.put({ year, id, image, variants, inStock: true });

    const { $metadata } = await Vehicles.delete({
      id,
      year,
    });

    expect($metadata.httpStatusCode).toBe(200);

    const found = await Vehicles.get({
      id,
      year,
    });

    expect(found.Item).toBe(undefined);
  });

  it("should delete with conditions", async () => {
    const id = "another id";
    const year = new Date("2019");

    const vehicle = { year, id, orders: 74, image, variants, inStock: true };
    await Vehicles.put(vehicle);

    await expect(async () => {
      await Vehicles.delete({
        id,
        year,
        orders: {
          $lt: 69,
        },
      });
    }).rejects.toThrowError();

    const found = await Vehicles.get({
      id,
      year,
    });

    expect(found.Item).deep.eq(vehicle);

    await Vehicles.delete({
      id,
      year,
      image,
      orders: {
        $gte: 70,
        $lte: 150,
      },
      $or: [
        {
          variants: {
            $size: 3,
            $includes: 1,
          },
        },
        {
          variants: {
            $size: {
              $gt: 1,
            },
          },
        },
      ],
    });

    const found2 = await Vehicles.get({
      id,
      year,
    });

    expect(found2.Item).toBe(undefined);
  });

  it("should to not return Attributes", async () => {
    const id = "some random id";
    await Vehicles.put({ year: 2014, id, image, variants, inStock: true });

    // @ts-expect-error
    const { Attributes } = await Vehicles.delete({
      id,
      year: 2014,
    });

    expect(Attributes).toBeUndefined();
  });

  it("should not execute", async () => {
    const input = await Vehicles.delete(
      {
        id: "some random id",
        year: 2014,
        image: {
          $size: {
            $gte: 3,
          },
        },
      },
      { ReturnValues: "ALL_OLD", exec: false }
    );

    expect(input).deep.eq({
      ReturnValues: "ALL_OLD",
      TableName: "vehicles",
      Key: { id: { S: "some random id" }, year: { N: "2014" } },
      ConditionExpression: "size(#n0) >= :v1",
      ExpressionAttributeNames: { "#n0": "image" },
      ExpressionAttributeValues: { ":v1": { N: "3" } },
    });
  });

  it("should normalize ReturnValues > Attributes", async () => {
    const year = "2034";
    const id = randomUUID();

    await Vehicles.put({
      year,
      id,
      image: Buffer.from("hello"),
      variants,
      inStock: true,
      make: "Audi",
      owner: john,
    });

    const res = await Vehicles.get({ id, year }, { Select: ["owner"] });

    // @ts-expect-error
    res.Item.id;
    expect(res.Item.owner).toBeInstanceOf(Person);

    const { Attributes } = await Vehicles.delete(
      {
        year,
        id,
        owner: john,
        make: {
          $size: {
            $between: [3, BigInt(44)],
            $in: [4],
          },
        },
      },

      { ReturnValues: "ALL_OLD", exec: true }
    );

    expect(Attributes).deep.eq({
      id,
      year: new Date(year),
      image: Buffer.from("hello"),
      variants,
      inStock: true,
      make: "Audi",
      owner: {
        firstname: "John",
        lastname: "Doe",
      },
    });
  });

  it("should convert Class instances to JS Object", async () => {
    const year = "2034";
    const id = randomUUID();

    const sara: Map<"firstname" | "lastname", string> = new Map();
    sara.set("firstname", "Sara").set("lastname", "Doee");

    const { Item: createdItem } = await Vehicles.put({
      year,
      id,
      inStock: true,
      owner: new Person("Sara", "Doee"),
    });

    // @ts-expect-error
    createdItem.image;

    await Vehicles.delete({
      id,
      year,
      // @ts-ignore
      owner: sara,
    });

    const { Item } = await Vehicles.get({ id, year });

    expect(Item).toBeUndefined();
  });
});
