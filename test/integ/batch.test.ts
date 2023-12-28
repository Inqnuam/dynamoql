import { describe, beforeAll, it, expect } from "vitest";
import { Fruits, type Fruit } from "./models/fruits";
import { Person } from "./models/common";

const ananas: Fruit = {
  name: "ananas",
  vitamins: {
    K: 5,
  },
  data: {
    country: "Egypt",
  },
};

describe("Test batch operations", () => {
  beforeAll(async () => {
    try {
      await Fruits.table.delete();
    } catch (error) {}
    await Fruits.table.create();
  });

  it("should batch PUT items", async () => {
    const annanasGroup = [ananas, ananas, ananas, ananas];
    await Fruits.batchPut(annanasGroup);
    const { ScannedCount, Items } = await Fruits.scan();

    expect(ScannedCount).toBe(4);

    Items.forEach((x) => {
      delete x.id;
    });

    expect(Items).deep.eq(annanasGroup);
  });

  it("should batch GET items", async () => {
    const apple: Fruit = {
      name: "apple",
      vitamins: {
        C: 4,
        K: 0,
      },
      data: "this is data",
    };

    const { Item } = await Fruits.put(apple);

    const { Items } = await Fruits.batchGet([{ id: Item.id }]);

    expect(Items[0]).deep.eq({ ...apple, id: Item.id });
  });

  it("should batch GET items with ids provided directly", async () => {
    const apple: Fruit = {
      name: "apple",
      vitamins: {
        C: 4,
        K: 0,
      },
      data: "this is data",
    };

    const { Item } = await Fruits.put(apple);

    const { Items } = await Fruits.batchGet([Item.id]);

    expect(Items[0]).deep.eq({ ...apple, id: Item.id });
  });

  it("should batch GET items - select", async () => {
    const apple: Fruit = {
      name: "apple",
      vitamins: {
        C: 4,
        K: 0,
      },
      data: null,
      author: {
        firstname: "John",
        lastname: "Doe",
      },
    };

    const { Item } = await Fruits.put(apple);

    const { Items } = await Fruits.batchGet([{ id: Item.id }], { Select: ["author"] });

    // @ts-expect-error
    Items[0].name;

    expect(Items[0].author.fullname).eq("John Doe");
  });

  it("should not execute Get", async () => {
    const res = await Fruits.batchGet([{ id: "some-id" }], { exec: false });

    expect(res).deep.eq({ RequestItems: { fruits: { Keys: [{ id: { S: "some-id" } }] } } });
  });

  it("should not execute Put", async () => {
    const res = await Fruits.batchPut([{ id: "some-id2", data: "some-data", name: "some-fruit" }], { exec: false });

    expect(res).deep.eq({ RequestItems: { fruits: [{ PutRequest: { Item: { id: { S: "some-id2" }, data: { S: "some-data" }, name: { S: "some-fruit" } } } }] } });
  });

  it("should return created Items", async () => {
    const { Items } = await Fruits.batchPut([{ id: "some-id2", data: "some-data", name: "some-fruit" }]);

    expect(Items).deep.eq([{ id: "some-id2", data: "some-data", name: "some-fruit" }]);
  });

  it("should batch DELETE items", async () => {
    const annanasGroup = [ananas, ananas, ananas, ananas];
    const { Items } = await Fruits.batchPut(annanasGroup);

    const deleteingItems = Items.map((x: Fruit) => ({ id: x.id }));

    const { UnprocessedItems } = await Fruits.batchDelete(deleteingItems);

    expect(UnprocessedItems).deep.eq({});
  });

  it("should batch Delete with only ids as keys", async () => {
    const annanasGroup = [ananas, ananas, ananas, ananas];
    const { Items } = await Fruits.batchPut(annanasGroup);

    const deleteingItems = Items.map((x: Fruit) => x.id);
    const { UnprocessedItems } = await Fruits.batchDelete(deleteingItems);

    expect(UnprocessedItems).deep.eq({});
    const { Items: foundItems } = await Fruits.batchGet(deleteingItems);
    expect(foundItems).deep.eq([]);
  });

  it("should not execute Delete", async () => {
    const res = await Fruits.batchDelete([{ id: "some-id2" }], { exec: false });

    expect(res).deep.eq({ RequestItems: { fruits: [{ DeleteRequest: { Key: { id: { S: "some-id2" } } } }] } });
  });

  it("should batch WRITE (Put | Delete) items", async () => {
    const apple: Fruit = {
      name: "apple",
      vitamins: {
        C: 4,
        K: 0,
      },
      data: null,
    };

    const { Item } = await Fruits.put(apple);
    const { Items } = await Fruits.batchWrite({ delete: [{ id: Item.id }], put: [apple] });

    const deletedItemResponse = await Fruits.get({ id: Item.id });
    expect(deletedItemResponse.Item).toBeUndefined();

    const [putItem] = Items;
    const putItemResponse = await Fruits.get({ id: putItem.id });

    expect(putItemResponse.Item).deep.eq({ ...apple, id: putItem.id });
  });

  it("should batch Write (delete) with ids as keys", async () => {
    const { Item } = await Fruits.put(ananas);

    await Fruits.batchWrite({ delete: [Item.id] });

    const { Item: foundItem } = await Fruits.get(Item.id);

    expect(foundItem).toBeUndefined();
  });

  it("should not execute Write", async () => {
    const res = await Fruits.batchWrite({ delete: [{ id: "some-id" }], put: [{ id: "some-awsome-id", name: "my-fav-fruit", data: null }] }, { exec: false });

    expect(res).deep.eq({
      RequestItems: {
        fruits: [
          { PutRequest: { Item: { id: { S: "some-awsome-id" }, name: { S: "my-fav-fruit" }, data: { NULL: true } } } },
          { DeleteRequest: { Key: { id: { S: "some-id" } } } },
        ],
      },
    });
  });

  it("should throw on union missing fields exception", async () => {
    await expect(async () => {
      await Fruits.batchPut([
        {
          name: "my fav fruit",
          // @ts-expect-error
          data: {
            //  must contain "country"
          },
        },
      ]);
    }).rejects.toThrowError();
  });

  it("should throw on union type exception", async () => {
    await expect(async () => {
      await Fruits.batchPut([
        {
          name: "my fav fruit",
          // @ts-expect-error
          data: {
            country: 4, //  must be a string
          },
        },
      ]);
    }).rejects.toThrowError();
  });

  it("should throw when union field conditions exception", async () => {
    await expect(async () => {
      await Fruits.batchPut([
        {
          name: "my fav fruit",
          data: new Set(["ab"]), // minLength must be 5
        },
      ]);
    }).rejects.toThrowError();
  });

  it("should throw on union field enum exception", async () => {
    await expect(async () => {
      await Fruits.batchPut([
        {
          name: "my fav fruit",
          // @ts-expect-error
          data: new Set([8] as const), // must be one of enum value 5, 10, 15, 20
        },
      ]);
    }).rejects.toThrowError();
  });

  it("should not throw on valid union field enum", async () => {
    await Fruits.batchPut([
      {
        name: "my fav fruit",
        data: new Set([5] as const), // must be one of enum value 5, 10, 15, 20
      },
    ]);
  });
});
