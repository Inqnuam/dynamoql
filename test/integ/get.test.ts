import { describe, beforeAll, it, expect } from "vitest";
import { Customers, type Customer } from "./models/customers";
import { randomUUID } from "crypto";

const customer: Customer = {
  id: "1234b",
  firstname: "John",
  lastname: "Doe",
  address: {
    country: "FR",
    city: "Paris",
    zip: 75001,
    street: "256 avenue des Champs-Élysées",
    foreign: false,
  },
  group: 911,
  contact: [
    {
      tel: 1234567890,
      email: "abc@def.gh",
      hour: {
        min: 9,
        max: 21,
      },
    },
  ],
  data: Buffer.from("some-data"),
};

describe("Test GET command", () => {
  beforeAll(async () => {
    try {
      await Customers.table.delete();
    } catch (error) {}

    await Customers.table.create();

    await Customers.put(customer);
  });

  it("should get item by id", async () => {
    const { Item } = await Customers.get({ id: "1234b" });
    expect(Item).deep.eq(customer);
  });

  it("should get item and select reserverd keyword top-level field", async () => {
    const { Item } = await Customers.get({ id: "1234b" }, { Select: ["group"] });
    expect(Item).deep.eq({ group: 911 });
  });

  it("should get item and select reserverd keyword top-level fields", async () => {
    const { Item } = await Customers.get({ id: "1234b" }, { Select: ["group", "lastname"] });
    expect(Item).deep.eq({ group: 911, lastname: "Doe" });
  });

  it("should get item and select nested field reserverd keyword", async () => {
    const { Item } = await Customers.get({ id: "1234b" }, { Select: ["address.foreign"] });

    expect(Item).deep.eq({
      address: {
        foreign: false,
      },
    });
  });

  it("should get item and select nested fields", async () => {
    const { Item } = await Customers.get({ id: "1234b" }, { Select: ["address.foreign", "address.country"] });

    expect(Item).deep.eq({
      address: {
        foreign: false,
        country: "FR",
      },
    });

    Item.address.country;
  });

  it("should convert Uint8Array to Buffer", async () => {
    const { Item } = await Customers.get({ id: "1234b" });

    expect(Item.data).toBeInstanceOf(Buffer);
  });

  it("should apply getters on top level field", async () => {
    const { Item: CreatedItem } = await Customers.put({
      data: Buffer.from("Hello"),
      firstname: "user-1",
      lastname: "user-1",
    });

    const { Item } = await Customers.get({ id: CreatedItem.id });

    expect(Item.data).toBe("WORLD");
  });

  it("should apply getters inside Set items", async () => {
    const { Item: CreatedItem } = await Customers.put({
      firstname: "user-1",
      lastname: "user-1",
      orders: new Set(["order-1", "order-2", "order-x"]),
    });

    const { Item } = await Customers.get({ id: CreatedItem.id });

    expect(Item.orders).deep.eq(new Set(["order-1", "order-2", "unknown"]));
  });

  it("should apply getters (number) inside union type", async () => {
    const { Item: CreatedItem } = await Customers.put({
      firstname: "user-1",
      lastname: "user-1",
      dummyData: 4,
    });

    const { Item } = await Customers.get({ id: CreatedItem.id });

    expect(Item.dummyData).eq(999);
  });

  it("should apply getters (string) inside union type", async () => {
    const { Item: CreatedItem } = await Customers.put({
      firstname: "user-1",
      lastname: "user-1",
      dummyData: "4",
    });

    const { Item } = await Customers.get({ id: CreatedItem.id });

    expect(Item.dummyData).eq("xxx");
  });
  it("should apply getters (nested object - string) inside union type", async () => {
    const { Item: CreatedItem } = await Customers.put({
      firstname: "user-1",
      lastname: "user-1",
      dummyData: {
        awsomeWorld: "some text",
      },
    });

    const { Item } = await Customers.get({ id: CreatedItem.id });

    // @ts-expect-error
    expect(Item.dummyData.awsomeWorld).eq("awsomeWorld");
  });

  it("should apply getters (nested object - number) inside union type", async () => {
    const { Item: CreatedItem } = await Customers.put({
      firstname: "user-1",
      lastname: "user-1",
      dummyData: {
        awsomeWorld: 123,
      },
    });

    const { Item } = await Customers.get({ id: CreatedItem.id });

    // @ts-ignore
    expect(Item.dummyData.awsomeWorld).eq(999);
  });

  it("should not apply a getter (based of getterInfo)", async () => {
    const { Item: CreatedItem } = await Customers.put({
      firstname: "user-1",
      lastname: "user-1",
      dummyData: {
        awsomeWorld: "original value",
      },
    });

    const { Item } = await Customers.get({ id: CreatedItem.id }, { getterInfo: { exec: false } });

    // @ts-ignore
    expect(Item.dummyData.awsomeWorld).eq("original value");
  });

  it("should not execute", async () => {
    const input = await Customers.get({ id: "dummy-id" }, { Select: ["contact[0].hour.min"], exec: false });

    expect(input).deep.eq({
      TableName: "customers",
      Key: { id: { S: "dummy-id" } },
      ProjectionExpression: "#n0[0].#n1.#n2",
      ExpressionAttributeNames: { "#n0": "contact", "#n1": "hour", "#n2": "min" },
    });
  });
});
