import { describe, beforeAll, it, expect } from "vitest";
import { Comments } from "./models/comments";
import { randomUUID } from "crypto";
import { UpdateStringExpr } from "../../dist/types/attributes/string";
import { DynamoQLInvalidMinMaxException, DynamoQLInvalidTypeException, DynamoQLValidatorException } from "../../dist";

describe("Test Put command", () => {
  beforeAll(async () => {
    try {
      await Comments.table.delete();
    } catch (error) {}
    await Comments.table.create();
  });

  it("should set default values", async () => {
    const id = "with default values";
    await Comments.put({
      id: id,
      articleId: 9,
      flag: null,
      text: "bad comment",
      userId: "4",
      answers: [
        {
          id: "some-id",
          date: Date.now(),
          userId: "user-2",
          text: "hater!",
        },
      ],
    });

    const { Item } = await Comments.get({ id });

    expect(Item.date).to.be.a("number");
    expect(Item.answers[0].reported).toBe(false);
  });

  it("should set default values inside union type", async () => {
    const id = "with default values 2";
    await Comments.put({
      id: id,
      articleId: 9,
      flag: null,
      text: "bad comment",
      userId: "4",
      answers: [
        {
          id: "some-id",
          date: Date.now(),
          userId: "user-2",
          text: "hater!",
        },
      ],
    });

    const { Item } = await Comments.get({ id });

    expect(Item.date).to.be.a("number");
    expect(Item.answers[0].reported).toBe(false);
  });

  it("should throw an error when required field is not provided", async () => {
    await expect(async () => {
      await Comments.put({
        articleId: 9,
        flag: null,
        text: "bad comment",
        userId: "4",
        answers: [
          // @ts-expect-error
          {
            id: "some-id",
            date: Date.now(),
            userId: "user-2",
          },
        ],
      });
    }).rejects.toThrow(DynamoQLValidatorException);

    await expect(async () => {
      await Comments.put({
        id: "1",
        articleId: 9,
        flag: null,
        text: "bad comment",
        userId: "4",
        answers: [
          // @ts-expect-error
          {
            id: "2",
            date: Date.now(),
            userId: "user-2",
          },

          // @ts-expect-error
          {
            id: "3",
            userId: "user-2",
            text: "answer 2",
          },
        ],
      });
    }).rejects.toThrow(DynamoQLValidatorException);
  });

  it("should throw on invalid enum value", async () => {
    await expect(async () => {
      await Comments.put({
        articleId: 9,
        flag: null,
        text: "bad comment",
        userId: "4",
        answers: [
          {
            id: "some-id",
            date: Date.now(),
            userId: "user-2",
            text: "Hello world!",
            attachments: [
              {
                content: Buffer.from("somedata"),
                name: "Screenshot1.png",
                dummyData: "dummy",
                size: 55,

                type: "video",
              },
            ],
          },
        ],
      });
    }).rejects.toThrowError();
  });

  it("should throw on invalid string length (min)", async () => {
    await expect(async () => {
      await Comments.put({
        articleId: 9,
        flag: null,
        text: "bad comment",
        userId: "4",
        answers: [
          {
            id: "some-id",
            date: Date.now(),
            userId: "user-2",
            text: "H",
            attachments: [
              {
                content: Buffer.from("somedata"),
                name: "Screenshot1.png",
                size: 9,
                type: "image",
                dummyData: { nested: "value" },
              },
            ],
          },
        ],
      });
    }).rejects.toThrowError();
  });

  it("should throw on invalid string length (max)", async () => {
    await expect(async () => {
      await Comments.put({
        articleId: 9,
        flag: null,
        text: "bad comment",
        userId: "4",
        answers: [
          {
            id: "some-id",
            date: Date.now(),
            userId: "user-2",
            text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
            attachments: [
              {
                content: Buffer.from("somedata"),
                name: "Screenshot1.png",
                size: 9,
                type: "image",
                dummyData: { nested: "value" },
              },
            ],
          },
        ],
      });
    }).rejects.toThrowError();
  });

  it("should throw on invalid number size (min)", async () => {
    await expect(async () => {
      await Comments.put({
        articleId: 9,
        flag: null,
        text: "bad comment",
        userId: "4",
        answers: [
          {
            id: "some-id",
            date: Date.now(),
            userId: "user-2",
            text: "Helloo",
            attachments: [
              {
                content: Buffer.from("somedata"),
                name: "Screenshot1.png",
                size: 3,
                type: "image",
                dummyData: { nested: "value" },
              },
            ],
          },
        ],
      });
    }).rejects.toThrowError();
  });

  it("should throw on invalid number size (max)", async () => {
    await expect(async () => {
      await Comments.put({
        articleId: 9,
        flag: null,
        text: "bad comment",
        userId: "4",
        answers: [
          {
            id: "some-id",
            date: Date.now(),
            userId: "user-2",
            text: "Helloo",
            attachments: [
              {
                content: Buffer.from("somedata"),
                name: "Screenshot1.png",
                size: 68,
                type: "image",
                dummyData: { nested: "value" },
              },
            ],
          },
        ],
      });
    }).rejects.toThrowError();
  });
  it("should throw on invalid number size (NaN)", async () => {
    await expect(async () => {
      await Comments.put({
        articleId: 9,
        flag: null,
        text: "bad comment",
        userId: "4",
        views: NaN,
      });
    }).rejects.toThrow(DynamoQLInvalidTypeException);
  });

  it("should throw on invalid buffer size (min)", async () => {
    await expect(async () => {
      await Comments.put({
        articleId: 9,
        flag: null,
        text: "bad comment",
        userId: "4",
        answers: [
          {
            id: "some-id",
            date: Date.now(),
            userId: "user-2",
            text: "Helloo",
            attachments: [
              {
                content: Buffer.from("abcd"),
                name: "Screenshot1.png",
                size: 7,
                type: "image",
                dummyData: { nested: "value" },
              },
            ],
          },
        ],
      });
    }).rejects.toThrowError();
  });

  it("should throw on invalid buffer size (max)", async () => {
    await expect(async () => {
      await Comments.put({
        articleId: 9,
        flag: null,
        text: "bad comment",
        userId: "4",
        answers: [
          {
            id: "some-id",
            date: Date.now(),
            userId: "user-2",
            text: "Helloo",
            attachments: [
              {
                content: Buffer.from("abcdefghijkl"),
                name: "Screenshot1.png",
                size: 7,
                type: "image",
                dummyData: { nested: "value" },
              },
            ],
          },
        ],
      });
    }).rejects.toThrowError();
  });

  it("should throw on invalid string length (min) inside Set", async () => {
    await expect(async () => {
      await Comments.put({
        articleId: 9,
        flag: null,
        text: "bad comment",
        userId: "4",
        answers: [
          {
            id: "some-id",
            date: Date.now(),
            userId: "user-2",
            text: "Lorem Ipsum is simply dummy",
            attachments: [
              {
                content: Buffer.from("somedata"),
                name: "Screenshot1.png",
                size: 9,
                type: "image",
                downloadedBy: new Set(["a"]),
                dummyData: { nested: "value" },
              },
            ],
          },
        ],
      });
    }).rejects.toThrowError();
  });

  it("should throw on invalid date (min)", async () => {
    expect(async () => {
      await Comments.put({
        articleId: 9,
        flag: null,
        text: "bad comment",
        userId: "4",
        TTL: new Date("2010"),
      });
    }).rejects.toThrow(DynamoQLInvalidMinMaxException);
  });

  it("should throw on invalid date (max)", async () => {
    expect(async () => {
      await Comments.put({
        articleId: 9,
        flag: null,
        text: "bad comment",
        userId: "4",
        TTL: new Date("2068"),
      });
    }).rejects.toThrow(DynamoQLInvalidMinMaxException);
  });

  it("should throw with custom validator error", async () => {
    await expect(async () => {
      await Comments.put({
        articleId: 9,
        flag: null,
        text: "bad comment",
        userId: "4",
        answers: [
          {
            id: "some-id",
            date: Date.now(),
            userId: "user-2",
            text: "INVALID_VALUE",
            attachments: [
              {
                content: Buffer.from("somedata"),
                name: "Screenshot1.png",
                size: 9,
                type: "image",
                dummyData: { nested: "value" },
              },
            ],
          },
        ],
      });
    }).rejects.toThrowError();
  });

  it("should throw with custom validator error inside union type", async () => {
    await expect(async () => {
      await Comments.put({
        articleId: 9,
        flag: null,
        text: "bad comment",
        userId: "4",
        answers: [
          {
            id: "some-id",
            date: Date.now(),
            userId: "user-2",
            text: "awsome answer",
            attachments: [
              {
                content: Buffer.from("somedata"),
                name: "Screenshot1.png",
                size: 9,
                type: "image",
                dummyData: "invalid_value",
              },
            ],
          },
        ],
      });
    }).rejects.toThrowError();
  });

  it("should not throw with valid Item", async () => {
    await Comments.put({
      id: randomUUID(),
      articleId: 9,
      flag: null,
      text: "bad comment",
      userId: "4",
      answers: [
        {
          id: "some-id",
          date: Date.now(),
          userId: "user-2",
          text: "Lorem Ipsum is simply dummy",
          attachments: [
            {
              content: Buffer.from("somedata"),
              name: "Screenshot1.png",
              size: 9,
              type: "image",
              downloadedBy: new Set(["aa"]),
              dummyData: { nested: "value" },
            },
          ],
        },
      ],
    });
  });

  it("should convert date instance to number (timestamp)", async () => {
    const updatedDate = new Date();
    const id = randomUUID();
    const { Item: CreatedItem } = await Comments.put({
      id,
      articleId: 9,
      flag: null,
      text: "bad comment",
      userId: "4",
      updatedDate,
    });

    expect(CreatedItem.updatedDate).toBe(updatedDate.getTime());

    const { Item } = await Comments.get({ id });
    expect(Item.updatedDate).deep.eq(updatedDate);
  });

  it("should convert date instance to number (epoch)", async () => {
    const TTL = new Date();
    const id = randomUUID();
    const { Item: CreatedItem } = await Comments.put({
      id,
      articleId: 9,
      flag: null,
      text: "bad comment",
      userId: "4",
      TTL,
    });

    const ttl = Math.floor(TTL.getTime() / 1000);

    expect(CreatedItem.TTL).toBe(ttl);

    const { Item } = await Comments.get({ id });

    expect(Math.floor(Item.TTL.getTime() / 1000)).toBe(ttl);
  });

  it("should fail to set invalid date", async () => {
    expect(async () => {
      await Comments.put({
        // id,
        articleId: 9,
        flag: null,
        text: "bad comment",
        userId: "4",
        TTL: "invalid date",
      });
    }).rejects.toThrow(DynamoQLInvalidTypeException);
  });
  it("should be able to insert and get an empty object", async () => {
    const id = randomUUID();
    await Comments.put({
      id,
      articleId: 9,
      flag: null,
      text: "bad comment",
      userId: "4",
      answers: [
        {
          id: "some-id",
          date: Date.now(),
          userId: "user-2",
          text: "Lorem Ipsum is simply dummy",
          attachments: [
            {
              content: Buffer.from("somedata"),
              name: "Screenshot1.png",
              size: 9,
              type: "image",
              dummyData: {},
            },
          ],
        },
      ],
    });

    const { Item } = await Comments.get({ id });

    const { dummyData } = Item.answers[0].attachments[0];
    expect(dummyData).deep.eq({});
  });

  it("should be able to insert and get 'ANY' item", async () => {
    const id = randomUUID();
    await Comments.put({
      id,
      articleId: 9,
      flag: null,
      text: "bad comment",
      userId: "4",
      answers: [
        {
          id: "some-id",
          date: Date.now(),
          userId: "user-2",
          text: "Lorem Ipsum is simply dummy",
          attachments: [
            {
              content: Buffer.from("somedata"),
              name: "Screenshot1.png",
              size: 9,
              type: "image",
              dummyData: true,
            },
          ],
        },
      ],
    });

    const { Item } = await Comments.get({ id });

    const { dummyData } = Item.answers[0].attachments[0];
    expect(dummyData).toBe(true);
  });

  it("should should apply string transformers", async () => {
    const id = randomUUID();
    await Comments.put({
      id,
      articleId: 9,
      flag: null,
      text: "bad comment",
      userId: "4",
      answers: [
        {
          id: "some-id",
          date: Date.now(),
          userId: "user-2",
          text: "lorem Ipsum",
          attachments: [
            {
              content: Buffer.from("somedata"),
              name: "Screenshot1.png   ",
              size: 9,
              type: "image",
              dummyData: true,
              downloadedBy: new Set(["             user-9 "]),
            },
          ],
        },
      ],
    });

    const { Item } = await Comments.get({ id });

    const [answer] = Item.answers;
    const { text } = answer;
    const { name, downloadedBy } = answer.attachments[0];
    expect(text).toBe("Lorem Ipsum");
    expect(name).toBe("screenshot1.png");
    expect(Array.from((downloadedBy as Set<string>).values())).deep.eq(["user-9"]);
  });

  it("should should apply field setters", async () => {
    const id = randomUUID();
    await Comments.put({
      id,
      articleId: 9,
      flag: null,
      text: "bad comment",
      userId: "4",
      answers: [
        {
          id: "some-id",
          date: Date.now(),
          userId: "user-2",
          text: "lorem Ipsum is very stupid",
          attachments: [
            {
              content: Buffer.from("somedata"),
              name: "Screenshot1.png   ",
              size: 9,
              type: "image",
              dummyData: true,
              downloadedBy: new Set(["             user-9 ", "", "     "]),
            },
          ],
        },
      ],
    });

    const { Item } = await Comments.get({ id });

    const [answer] = Item.answers;
    const { text } = answer;
    const { downloadedBy } = answer.attachments[0];
    expect(text).toBe("Lorem Ipsum is very intelligent");
    expect(Array.from((downloadedBy as Set<string>).values())).deep.eq(["user-9"]);
  });

  it("should not should apply field setters (based on setterInfo)", async () => {
    const id = randomUUID();
    await Comments.put(
      {
        id,
        articleId: 9,
        flag: null,
        text: "bad comment",
        userId: "4",
        answers: [
          {
            id: "some-id",
            date: Date.now(),
            userId: "user-2",
            text: "lorem Ipsum is very stupid",
            attachments: [
              {
                content: Buffer.from("somedata"),
                name: "Screenshot1.png   ",
                size: 9,
                type: "image",
                dummyData: true,
                downloadedBy: new Set(["             user-9 ", "", "     "]),
              },
            ],
          },
        ],
      },
      undefined,
      { setterInfo: { exec: false } }
    );

    const { Item } = await Comments.get({ id });

    const [answer] = Item.answers;
    const { text } = answer;

    expect(text).toBe("Lorem Ipsum is very stupid");
  });

  it("should should apply field setters inside union type", async () => {
    const id = randomUUID();
    await Comments.put({
      id,
      articleId: 9,
      flag: null,
      text: "bad comment",
      userId: "4",
      answers: [
        {
          id: "some-id",
          date: Date.now(),
          userId: "user-2",
          text: "lorem Ipsum is very stupid",
          attachments: [
            {
              content: Buffer.from("somedata"),
              name: "Screenshot1.png   ",
              size: 9,
              type: "image",
              dummyData: "some-value",
            },
          ],
        },
      ],
    });

    const { Item } = await Comments.get({ id });

    const [answer] = Item.answers;

    const { dummyData } = answer.attachments[0];

    expect(dummyData).toBe("SOME-VALUE-dummyValue");
  });

  it("should not put item if attribute doesnt exists", async () => {
    const { Item } = await Comments.put({
      articleId: 9,
      flag: null,
      text: "bad comment",
      userId: "4",
      answers: [
        {
          id: "some-id",
          date: Date.now(),
          userId: "user-2",
          text: "lorem Ipsum",
          attachments: [
            {
              content: Buffer.from("somedata"),
              name: "Screenshot1.png   ",
              size: 9,
              type: "image",
              dummyData: true,
              downloadedBy: new Set(["             user-9 "]),
            },
          ],
        },
      ],
    });

    await expect(async () => {
      await Comments.put(
        {
          id: Item.id,
          articleId: 9,
          flag: null,
          text: "bad comment",
          userId: "4",
        },
        { id: { $exists: false } }
      );
    }).rejects.toThrowError();
  });

  it("should not put item if attribute value doesnt matchs", async () => {
    const { Item } = await Comments.put({
      articleId: 9,
      flag: null,
      text: "bad comment",
      userId: "4",
      answers: [
        {
          id: "some-id",
          date: Date.now(),
          userId: "user-2",
          text: "lorem Ipsum",
          attachments: [
            {
              content: Buffer.from("somedata"),
              name: "Screenshot1.png   ",
              size: 9,
              type: "image",
              dummyData: true,
              downloadedBy: new Set(["             user-9 "]),
            },
          ],
        },
      ],
    });

    await expect(async () => {
      await Comments.put(
        {
          articleId: 9,
          flag: null,
          text: "bad comment",
          userId: "4",
          id: Item.id,
        },
        {
          // @ts-expect-error
          answers: "",
        }
      );
    }).rejects.toThrowError();
  });

  it("should put item if $size matchs", async () => {
    const { Item } = await Comments.put({
      articleId: 9,
      flag: null,
      text: "bad comment",
      userId: "4",
      answers: [
        {
          id: "some-id",
          date: Date.now(),
          userId: "user-2",
          text: "lorem Ipsum",
          attachments: [
            {
              content: Buffer.from("somedata"),
              name: "Screenshot1.png   ",
              size: 9,
              type: "image",
              dummyData: true,
              downloadedBy: new Set(["             user-9 "]),
            },
          ],
        },
      ],
    });
    await Comments.put(
      {
        articleId: 9,
        flag: null,
        text: "good comment",
        userId: "4",
        id: Item.id,
      },
      {
        "answers[0].attachments[0]": {
          downloadedBy: {
            $size: {
              $gt: BigInt(-45),
              $neq: 5,
            },
          },
        },
      }
    );

    const res = await Comments.get({ id: Item.id });

    expect(res.Item.text).toBe("good comment");
    expect(res.Item.answers).toBeUndefined();
  });

  it("should not SET value if attribute exists - $ifNotExists", async () => {
    const { Item } = await Comments.put({
      articleId: 9,
      flag: null,
      text: "bad comment",
      userId: "4",
    });

    await Comments.update(
      { id: Item.id },
      {
        text: {
          $ifNotExists: "changed comment",
        },
      }
    );

    const foundItem = await Comments.get({ id: Item.id });

    expect(foundItem.Item.text).toBe("bad comment");
  });

  it("should SET value if attribute dont exists - $ifNotExists", async () => {
    const { Item } = await Comments.put({
      articleId: 9,
      flag: null,
      text: "bad comment",
      userId: "4",
    });

    await Comments.update(
      { id: Item.id },
      {
        dummyAttribute: {
          $ifNotExists: "dummy value",
        } satisfies UpdateStringExpr,
      }
    );

    const foundItem = await Comments.get({ id: Item.id });

    expect(foundItem.Item.dummyAttribute).toBe("dummy value");
  });

  it("should SET value if nested attribute dont exists - $ifNotExists", async () => {
    const { Item } = await Comments.put({
      articleId: 9,
      flag: null,
      text: "bad comment",
      userId: "4",
      answers: [
        {
          date: Date.now(),
          id: "some id",
          text: "some text",
          userId: "some user id",
          attachments: [
            {
              content: Buffer.from("hello"),
              dummyData: null,
              name: "some name",
              size: 5,
              type: "image",
            },
          ],
        },
      ],
    });

    await Comments.update(
      { id: Item.id },
      {
        answers: {
          "[0]": {
            attachments: {
              "[0]": {
                dummyAttribute: {
                  $ifNotExists: "dummy value",
                } satisfies UpdateStringExpr,
              },
            },
          },
        },
      }
    );

    const foundItem = await Comments.get({ id: Item.id });

    expect(foundItem.Item.answers[0].attachments[0].dummyAttribute).toBe("dummy value");
  });

  it("should SET value if string literal path attribute dont exists - $ifNotExists", async () => {
    const { Item } = await Comments.put({
      articleId: 9,
      flag: null,
      text: "bad comment",
      userId: "4",
      answers: [
        {
          date: Date.now(),
          id: "some id",
          text: "some text",
          userId: "some user id",
          attachments: [
            {
              content: Buffer.from("hello"),
              dummyData: null,
              name: "some name",
              size: 5,
              type: "image",
            },
          ],
        },
      ],
    });

    await Comments.update(
      { id: Item.id },
      {
        "answers[0].attachments[0].dummyAttribute": {
          $ifNotExists: "dummy value",
        },
      }
    );

    const foundItem = await Comments.get({ id: Item.id });

    expect(foundItem.Item.answers[0].attachments[0].dummyAttribute).toBe("dummy value");
  });

  it("should crash when $ifNotExists value is not a valid item", async () => {
    const { Item } = await Comments.put({
      articleId: 9,
      flag: null,
      text: "bad comment",
      userId: "4",
    });

    await expect(async () => {
      await Comments.update(
        { id: Item.id },
        {
          text: {
            // @ts-expect-error
            $ifNotExists: 5456,
          },
        }
      );
    }).rejects.toThrowError();
  });

  it("should ignore undeclared values in nested array-object", async () => {
    const { Item } = await Comments.put({
      articleId: 9,
      flag: null,
      text: "bad comment",
      userId: "4",
      answers: [
        {
          date: 55,
          id: "some-id",
          text: "some text",
          userId: "some-user-id",
          undefinedField: "undefinedValue",
        },
      ],
    });

    const foundItem = await Comments.get({ id: Item.id });
    expect(foundItem.Item.answers).deep.eq([
      {
        date: 55,
        reported: false,
        id: "some-id",
        text: "Some text",
        userId: "some-user-id",
      },
    ]);
  });

  it("should unmarshall Attributes", async () => {
    const { Item } = await Comments.put({
      articleId: 3,
      flag: null,
      text: "hello",
      userId: "user-999",
    });

    const { Attributes } = await Comments.put(
      {
        id: Item.id,
        articleId: 9,
        flag: null,
        text: "hello",
        userId: "user-999",
        answers: [],
      },
      null,
      { ReturnValues: "ALL_OLD" }
    );

    expect(Attributes.articleId).toBe(3);
  });

  it("should put item with conditions", async () => {
    const { Item: createdItem } = await Comments.put({
      articleId: 3,
      flag: null,
      text: "hello",
      userId: "user-999",
      date: 1701084437430,
    });

    await Comments.put(
      {
        id: createdItem.id,
        articleId: 3,
        flag: null,
        text: "hello",
        userId: "user-999",
        date: 1701084437430,
        answers: [],
      },
      {
        answers: {
          $exists: false,
        },
        $or: [
          {
            date: {
              $gt: 1701084437432,
            },
          },
          {
            text: {
              $startsWith: "h",
            },
          },
        ],
      }
    );

    const { Item } = await Comments.get(createdItem.id, { Select: ["answers"] });

    expect(Item).deep.eq({ answers: [] });
  });

  it("should put item with empty conditions", async () => {
    const updatedDate = new Date();
    const { Item: createdItem } = await Comments.put({
      articleId: 3,
      flag: null,
      text: "hello",
      userId: "user-999",
      date: 1701084437430,
      updatedDate,
    });

    const { Attributes } = await Comments.put(
      {
        id: createdItem.id,
        articleId: 3,
        flag: null,
        text: "hello",
        userId: "user-999",
        date: 1701084437430,
        answers: [],
      },
      {},
      { ReturnValues: "ALL_OLD" }
    );

    expect(Attributes.updatedDate).deep.eq(updatedDate);

    const { Item } = await Comments.get(createdItem.id, { Select: ["answers"] });

    expect(Item).deep.eq({ answers: [] });
  });

  it("should not execute", async () => {
    const input = await Comments.put(
      {
        id: "1234567890",
        articleId: 3,
        flag: null,
        text: "hello",
        userId: "user-999",
        date: 1701084437430,
      },
      {
        "answers[0].id": {
          $exists: true,
        },
        $or: [
          {
            date: {
              $gt: 1701084437432,
            },
          },
          {
            text: {
              $startsWith: "h",
            },
          },
        ],
      },
      { exec: false }
    );

    expect(input).deep.eq({
      TableName: "comments",
      Item: {
        id: { S: "1234567890" },
        articleId: { N: "3" },
        flag: { NULL: true },
        text: { S: "hello" },
        userId: { S: "user-999" },
        date: { N: "1701084437430" },
        views: { N: "0" },
      },
      ConditionExpression: "(attribute_exists(#n0[0].#n1)) AND ((#n2 > :v3) OR (begins_with(#n4, :v5)))",
      ExpressionAttributeNames: { "#n0": "answers", "#n1": "id", "#n2": "date", "#n4": "text" },
      ExpressionAttributeValues: { ":v3": { N: "1701084437432" }, ":v5": { S: "h" } },
    });
  });
});
