import { describe, it, expect } from "vitest";
import { predictTypeFromUnion } from "../../src/common/predictUnionMatchedType";
import { Schema } from "../../src";

const schema = new Schema({
  id: {
    type: String,
    default: "some-id",
    primaryIndex: true,
  },
  birthday: [String, Number, { type: Object, fields: { year: Number, month: Number, day: Number } }],
  bestFriend: [
    { type: Object, fields: { name: String, age: Number } },
    { type: Object, fields: { name: String, age: Number, notifications: Boolean } },
  ],
  network: [
    { type: Object, fields: { id: Number } },
    { type: Object, fields: { mail: String } },
    { type: Object, fields: { id: String } },
    { type: Object, fields: { id: String, mail: String } },
    { type: Object, allowUndeclared: true, fields: { id: String, mail: String } },
  ],

  dummyData: [
    { type: Object, fields: {} },
    { type: Object, allowUndeclared: true, fields: {} },
  ],

  orders: [
    { type: Array, items: String },
    Boolean,
    Number,
    { type: Array, items: { type: Object, fields: { id: String } } },
    { type: Array, items: { type: Object, fields: { orderId: Number } } },
    { type: Array, items: { type: Array, items: String } },
    { type: Array, items: { type: Array, items: Number } },
    { type: Array, items: { type: Array, items: { type: Object, fields: { field1: String, field2: Number } } } },
    { type: Array, items: { type: Array, items: { type: Object, fields: { knownField: Number }, allowUndeclared: true } } },
  ],
  books: [
    { type: Object, fields: { id: [String, Number] } },
    { type: Object, fields: { id: Number, title: String } },
    {
      type: Object,
      fields: {
        pages: [
          { type: Object, fields: { done: Boolean } },
          { type: Object, fields: { done: { type: Array, items: Number } } },
        ],
      },
    },
    {
      type: Object,
      fields: {
        pages: [
          { type: Object, fields: { total: Number } },
          {
            type: Object,
            fields: {
              done: {
                type: Array,
                items: [
                  { type: Object, fields: { pageN: Number, read: Boolean } },
                  { type: Object, fields: { pageN: Number, readDate: Number } },
                ],
              },
            },
          },
        ],
      },
    },
    {
      type: Object,
      fields: {
        pages: [
          { type: Object, fields: { total: Number } },
          {
            type: Object,
            fields: {
              done: {
                type: Array,
                items: { type: Object, fields: { pageN: Number, readDate: [Number, String] } },
              },
            },
          },
        ],
      },
    },
    {
      type: Object,
      fields: {
        pages: [
          { type: Object, fields: { total: Number } },
          {
            type: Object,
            fields: {
              done: {
                type: Array,
                items: { type: Object, allowUndeclared: true, fields: { pageN: Number, readDate: [Number, String] } },
              },
            },
          },
        ],
      },
    },
  ],
  favorites: [Boolean, String, Number, BigInt, { type: Object, fields: { items: String } }, { type: Array, items: Number }, { type: Set, items: String }],
  likes: [
    { type: Set, items: String },
    { type: Set, items: Number },
    { type: Set, items: Buffer },
  ],
  events: [
    Date,
    String,
    { type: Set, items: Number },
    { type: Object, fields: { someDate: Date } },
    { type: Object, fields: { someDate: Boolean } },
    { type: Array, items: String },
    { type: Array, items: Date },
  ],
} as const);

const birthdaySchemaType = schema["fields"].birthday.type;
const friendsSchemaType = schema["fields"].bestFriend.type;
const networkSchemaType = schema["fields"].network.type;
const emptySchemaType = schema["fields"].dummyData.type;
const ordersSchemaType = schema["fields"].orders.type;
const booksSchemaType = schema["fields"].books.type;
const favoritesSchemaType = schema["fields"].favorites.type;
const likesSchemaType = schema["fields"].likes.type;
const eventsSchemaType = schema["fields"].events.type;

describe("Predict union matched type", () => {
  describe("Simple union predict", () => {
    it("should return string schema type", () => {
      const foundSchema = predictTypeFromUnion(birthdaySchemaType, "1924");
      expect(foundSchema).eq(birthdaySchemaType[0]);
    });

    it("should return number schema type", () => {
      const foundSchema = predictTypeFromUnion(birthdaySchemaType, 1924);
      expect(foundSchema).eq(birthdaySchemaType[1]);
    });

    it("should return object schema type", () => {
      const foundSchema = predictTypeFromUnion(birthdaySchemaType, { year: 1924, month: 1, day: 13 });
      expect(foundSchema).eq(birthdaySchemaType[2]);
    });

    it("should not find with boolean value", () => {
      const foundSchema = predictTypeFromUnion(birthdaySchemaType, true);
      expect(foundSchema).toBeUndefined();
    });

    it("should not find with null value", () => {
      const foundSchema = predictTypeFromUnion(birthdaySchemaType, null);
      expect(foundSchema).toBeUndefined();
    });

    it("should not find with array value", () => {
      const foundSchema = predictTypeFromUnion(birthdaySchemaType, []);
      expect(foundSchema).toBeUndefined();
    });

    it("should not find with Set value", () => {
      const foundSchema = predictTypeFromUnion(birthdaySchemaType, new Set([""]));
      expect(foundSchema).toBeUndefined();
    });

    it("should not find with binary value", () => {
      const foundSchema = predictTypeFromUnion(birthdaySchemaType, Buffer.from("Hello WORLD"));
      expect(foundSchema).toBeUndefined();
    });

    it("should find with wrong object value (empty)", () => {
      const foundSchema = predictTypeFromUnion(birthdaySchemaType, {});
      expect(foundSchema).eq(birthdaySchemaType[2]);
    });

    it("should find with wrong object value (missing key)", () => {
      const foundSchema = predictTypeFromUnion(birthdaySchemaType, { year: 1924, month: 1 });
      expect(foundSchema).eq(birthdaySchemaType[2]);
    });

    it("should find with wrong object value (missing keys)", () => {
      const foundSchema = predictTypeFromUnion(birthdaySchemaType, { year: 1924 });
      expect(foundSchema).eq(birthdaySchemaType[2]);
    });

    it("should find with Set schema", () => {
      const foundSchema = predictTypeFromUnion(favoritesSchemaType, new Set([""]));
      expect(foundSchema).eq(favoritesSchemaType[6]);
    });
  });

  describe("Multiple Objects (known fields)", () => {
    it("should find with wrong object value (first object matched type)", () => {
      const foundSchema = predictTypeFromUnion(friendsSchemaType, {});
      expect(foundSchema).eq(friendsSchemaType[0]);
    });

    it("should return object schema type 1", () => {
      const foundSchema = predictTypeFromUnion(friendsSchemaType, { name: "a", age: 21 });
      expect(foundSchema).eq(friendsSchemaType[0]);
    });
    it("should return object schema type 2", () => {
      const foundSchema = predictTypeFromUnion(friendsSchemaType, { name: "a", age: 21, notifications: false });
      expect(foundSchema).eq(friendsSchemaType[1]);
    });

    it("should find with wrong object value (missing key)", () => {
      const foundSchema = predictTypeFromUnion(friendsSchemaType, { name: "a", notifications: true });
      expect(foundSchema).eq(friendsSchemaType[1]);
    });

    it("should find with wrong object value (missing key + wrong value)", () => {
      const foundSchema = predictTypeFromUnion(friendsSchemaType, { name: 2, notifications: true });
      expect(foundSchema).eq(friendsSchemaType[1]);
    });
  });

  describe("Multiple Objects (mixed fields)", () => {
    it("should find with empty object value (first matched object type)", () => {
      const foundSchema = predictTypeFromUnion(networkSchemaType, {});
      expect(foundSchema).eq(networkSchemaType[0]);
    });

    it("should find with wrong object field-value (allowUndeclared)", () => {
      const foundSchema = predictTypeFromUnion(networkSchemaType, { someField: "a", someBool: true });
      expect(foundSchema).eq(networkSchemaType[4]);
    });

    it("should return object schema type (number)", () => {
      const foundSchema = predictTypeFromUnion(networkSchemaType, { id: 21 });
      expect(foundSchema).eq(networkSchemaType[0]);
    });

    it("should return object schema type (string)", () => {
      const foundSchema = predictTypeFromUnion(networkSchemaType, { id: "false" });
      expect(foundSchema).eq(networkSchemaType[2]);
    });

    it("should return object schema type (string)", () => {
      const foundSchema = predictTypeFromUnion(networkSchemaType, { mail: "false" });
      expect(foundSchema).eq(networkSchemaType[1]);
    });

    it("should return object schema object (known)", () => {
      const foundSchema = predictTypeFromUnion(networkSchemaType, { id: "1", mail: "false" });
      expect(foundSchema).eq(networkSchemaType[3]);
    });

    it("should return object schema object (known invalid value)", () => {
      const foundSchema = predictTypeFromUnion(networkSchemaType, { id: 4, mail: "false" });
      expect(foundSchema).eq(networkSchemaType[3]);
    });

    it("should return object schema object (unknown)", () => {
      const foundSchema = predictTypeFromUnion(networkSchemaType, { id: 4, mail: "false", hello: "WORLD" });
      expect(foundSchema).eq(networkSchemaType[3]);
    });

    it("should return object schema object (unknown)", () => {
      const foundSchema = predictTypeFromUnion(networkSchemaType, { id: "4", mail: "false", hello: "WORLD" });
      expect(foundSchema).eq(networkSchemaType[4]);
    });
  });

  describe("Multiple empty objects", () => {
    it("should find exact empty object", () => {
      const foundSchema = predictTypeFromUnion(emptySchemaType, {});
      expect(foundSchema).eq(emptySchemaType[0]);
    });

    it("should find allow undeclared field object", () => {
      const foundSchema = predictTypeFromUnion(emptySchemaType, { hello: true });
      expect(foundSchema).eq(emptySchemaType[1]);
    });
  });

  describe("Array union predict", () => {
    it("should not find ", () => {
      const foundSchema = predictTypeFromUnion(ordersSchemaType, {});
      expect(foundSchema).toBeUndefined();
    });

    it("should return number schema ", () => {
      const foundSchema = predictTypeFromUnion(ordersSchemaType, 654);
      expect(foundSchema).eq(ordersSchemaType[2]);
    });

    it("should return boolean schema ", () => {
      const foundSchema = predictTypeFromUnion(ordersSchemaType, false);
      expect(foundSchema).eq(ordersSchemaType[1]);
    });

    it("should return string[] schema ", () => {
      const foundSchema = predictTypeFromUnion(ordersSchemaType, ["hello"]);
      expect(foundSchema).eq(ordersSchemaType[0]);
    });

    it("should return {id: string}[] schema (exact match)", () => {
      const foundSchema = predictTypeFromUnion(ordersSchemaType, [{ id: "some-id" }]);
      expect(foundSchema).eq(ordersSchemaType[3]);
    });

    it("should return {id: string}[] schema (match with wrong value)", () => {
      const foundSchema = predictTypeFromUnion(ordersSchemaType, [{ id: 45 }]);
      expect(foundSchema).eq(ordersSchemaType[3]);
    });

    it("should return {orderId: string}[] schema (exact match)", () => {
      const foundSchema = predictTypeFromUnion(ordersSchemaType, [{ orderId: "some-id" }]);
      expect(foundSchema).eq(ordersSchemaType[4]);
    });

    it("should return {orderId: string}[] schema (match with wrong value)", () => {
      const foundSchema = predictTypeFromUnion(ordersSchemaType, [{ orderId: 45 }]);
      expect(foundSchema).eq(ordersSchemaType[4]);
    });

    it("should return string[][] schema ", () => {
      const foundSchema = predictTypeFromUnion(ordersSchemaType, [["hello"]]);
      expect(foundSchema).eq(ordersSchemaType[5]);
    });
    it("should return number[][] schema ", () => {
      const foundSchema = predictTypeFromUnion(ordersSchemaType, [[5435]]);
      expect(foundSchema).eq(ordersSchemaType[6]);
    });

    it("should return {field1: string; field2: number}[][] schema", () => {
      const foundSchema = predictTypeFromUnion(ordersSchemaType, [[{ field1: "aa", field2: 99 }]]);
      expect(foundSchema).eq(ordersSchemaType[7]);
    });

    it("should return {field1: string; field2: number}[][] schema (match with wrong value)", () => {
      const foundSchema = predictTypeFromUnion(ordersSchemaType, [[{ field1: "aa", field2: "99" }]]);
      expect(foundSchema).eq(ordersSchemaType[7]);
    });
    ``;

    it("should return {knownField: number}&{} [][] schema", () => {
      const foundSchema = predictTypeFromUnion(ordersSchemaType, [[{ knownField: "aa" }]]);
      expect(foundSchema).eq(ordersSchemaType[8]);
    });

    it("should return {knownField: number}&{} [][] schema", () => {
      const foundSchema = predictTypeFromUnion(ordersSchemaType, [[{ knownField: 76, hello: "WORLD" }]]);
      expect(foundSchema).eq(ordersSchemaType[8]);
    });
  });

  describe("Multi-level nested union types", () => {
    it("should return {id: string | number} schema ", () => {
      const foundSchema = predictTypeFromUnion(booksSchemaType, { id: "Hello" });
      expect(foundSchema).eq(booksSchemaType[0]);
    });

    it("should return {id: string | number} schema ", () => {
      const foundSchema = predictTypeFromUnion(booksSchemaType, { id: 5 });
      expect(foundSchema).eq(booksSchemaType[0]);
    });

    it("should return {id: string | number; title: string} schema ", () => {
      const foundSchema = predictTypeFromUnion(booksSchemaType, { id: 5, title: "some-name" });
      expect(foundSchema).eq(booksSchemaType[1]);
    });

    it("should return {id: number; title: string} schema (wrong value) ", () => {
      const foundSchema = predictTypeFromUnion(booksSchemaType, { id: "55", title: "some-name" });
      expect(foundSchema).eq(booksSchemaType[1]);
    });

    it("should return {id: number; title: string} schema (missing key) ", () => {
      const foundSchema = predictTypeFromUnion(booksSchemaType, { title: "some-name" });
      expect(foundSchema).eq(booksSchemaType[1]);
    });

    it("should return  schema  ", () => {
      const foundSchema = predictTypeFromUnion(booksSchemaType, { pages: { done: false } });
      expect(foundSchema).eq(booksSchemaType[2]);
    });

    it("should return  schema  ", () => {
      const foundSchema = predictTypeFromUnion(booksSchemaType, { pages: { done: [7] } });
      expect(foundSchema).eq(booksSchemaType[2]);
    });

    it("should return  schema wrong value ", () => {
      const foundSchema = predictTypeFromUnion(booksSchemaType, { pages: { done: ["aaa"] } });
      expect(foundSchema).eq(booksSchemaType[2]);
    });

    it("should return  schema ", () => {
      const foundSchema = predictTypeFromUnion(booksSchemaType, { pages: { total: 243 } });
      expect(foundSchema).eq(booksSchemaType[3]);
    });

    it("should return  schema wrong value ", () => {
      const foundSchema = predictTypeFromUnion(booksSchemaType, { pages: { total: { hello: "WORLD" } } });
      expect(foundSchema).eq(booksSchemaType[3]);
    });

    it("should return  schema ", () => {
      const foundSchema = predictTypeFromUnion(booksSchemaType, { pages: { done: [{ pageN: 5, read: true }] } });
      expect(foundSchema).eq(booksSchemaType[3]);
    });

    it("should return  schema ", () => {
      const foundSchema = predictTypeFromUnion(booksSchemaType, { pages: { done: [{ pageN: 5, readDate: 444 }] } });
      expect(foundSchema).eq(booksSchemaType[3]);
    });
    it("should return  schema ", () => {
      const foundSchema = predictTypeFromUnion(booksSchemaType, { pages: { done: [{ pageN: 5, readDate: "444" }] } });
      expect(foundSchema).eq(booksSchemaType[4]);
    });
    it("should return  schema wrong value ", () => {
      const foundSchema = predictTypeFromUnion(booksSchemaType, { pages: { done: [{ pageN: "5", readDate: "444" }] } });
      expect(foundSchema).eq(booksSchemaType[4]);
    });

    it("should return  schema (unkown fields)", () => {
      const foundSchema = predictTypeFromUnion(booksSchemaType, { pages: { done: [{ pageN: 5, readDate: "444", dummy: "dummy" }] } });
      expect(foundSchema).eq(booksSchemaType[5]);
    });
  });

  describe("Set schema type", () => {
    it("should return Set<string> schema type", () => {
      const foundSchema = predictTypeFromUnion(likesSchemaType, new Set(["hello", "world"]));
      expect(foundSchema).eq(likesSchemaType[0]);
    });
    it("should return Set<number> schema type", () => {
      const foundSchema = predictTypeFromUnion(likesSchemaType, new Set([45, 5]));
      expect(foundSchema).eq(likesSchemaType[1]);
    });

    it("should return Set<Buffer> schema type", () => {
      const foundSchema = predictTypeFromUnion(likesSchemaType, new Set([Buffer.from("Hello WORLD")]));
      expect(foundSchema).eq(likesSchemaType[2]);
    });
  });

  describe("Date predict", () => {
    it("should find Date type with Date instance", () => {
      const foundSchema = predictTypeFromUnion(eventsSchemaType, new Date());
      expect(foundSchema).eq(eventsSchemaType[0]);
    });

    it("should find Date type with Date timestamp", () => {
      const foundSchema = predictTypeFromUnion(eventsSchemaType, Date.now());
      expect(foundSchema).eq(eventsSchemaType[0]);
    });

    it("should find Date type with Date ISO string", () => {
      const foundSchema = predictTypeFromUnion(eventsSchemaType, new Date().toISOString());
      expect(foundSchema).eq(eventsSchemaType[0]);
    });

    it("should find Date invalid date string", () => {
      const foundSchema = predictTypeFromUnion(eventsSchemaType, "this is invalid date");
      expect(foundSchema).eq(eventsSchemaType[1]);
    });

    it("should find Date in nested object", () => {
      const foundSchema = predictTypeFromUnion(eventsSchemaType, { someDate: new Date() });
      expect(foundSchema).eq(eventsSchemaType[3]);
    });

    it("should not find Date type in nested object with wrong value", () => {
      const foundSchema = predictTypeFromUnion(eventsSchemaType, { someDate: false });
      expect(foundSchema).eq(eventsSchemaType[4]);
    });

    it("should find date[] ", () => {
      const foundSchema = predictTypeFromUnion(eventsSchemaType, [new Date()]);
      expect(foundSchema).eq(eventsSchemaType[6]);
    });

    it("should find date[] ", () => {
      const foundSchema = predictTypeFromUnion(eventsSchemaType, [new Date().toISOString()]);
      expect(foundSchema).eq(eventsSchemaType[6]);
    });

    it("should find string[] ", () => {
      const foundSchema = predictTypeFromUnion(eventsSchemaType, ["hello WORLD"]);
      expect(foundSchema).eq(eventsSchemaType[5]);
    });
  });
});
