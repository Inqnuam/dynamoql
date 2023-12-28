import { describe, it, expect } from "vitest";
import { deepClone, cloneArray, cloneBinary, cloneDate, cloneObject, cloneSet } from "../../src/common/deepClone";

describe("Test deepClone", () => {
  it("cloneSet", () => {
    const someValue = { hello: "world" };
    const myValue = new Set([someValue, "hello", 1234, false]);

    const clonedValue = cloneSet(myValue);

    expect(clonedValue).not.eq(myValue);

    const clondedSomeValueObject = Array.from(clonedValue.values())[0];

    expect(clondedSomeValueObject).not.eq(someValue);
    expect(clondedSomeValueObject).deep.eq(someValue);
  });

  it("cloneDate", () => {
    const myDate = new Date();
    const myClonedDate = cloneDate(myDate);

    expect(myDate).not.eq(myClonedDate);
    expect(myDate).deep.eq(myClonedDate);
  });

  it("cloneObject", () => {
    const myObject = {
      name: "John",
      data: {
        some: {
          value: {
            hello: true,
          },
        },
      },
    };

    const myClonedObject = cloneObject(myObject);

    expect(myObject).not.eq(myClonedObject);
    expect(myObject).deep.eq(myClonedObject);
  });

  it("cloneBinary", () => {
    const myBinary = Buffer.from("HELLO WORLD");
    const myClonedBinary = cloneBinary(myBinary);

    expect(myBinary).not.eq(myClonedBinary);
    expect(myBinary).deep.eq(myClonedBinary);
  });

  it("cloneArray", () => {
    const myObject = {
      name: "John",
      data: {
        some: {
          value: {
            hello: true,
            someArray: [{ name: "some name", data: { data: { hello: "some data" } } }],
          },
        },
      },
    };

    const myArray = ["Hello", 1234, true, false, null, myObject, ["Hello", 1234, true, false, null, myObject]];

    const myClonedArray = cloneArray(myArray);

    expect(myArray).not.eq(myClonedArray);
    expect(myArray).deep.eq(myClonedArray);
  });

  it("clone primitive", () => {
    const myString = "myString";
    const myNumber = 0;
    const myBigInt = BigInt("123123");
    const myBoolean = false;
    const myNull = null;
    const myUndefined = undefined;

    const myClonedString = deepClone(myString);
    const myClonedNumber = deepClone(myNumber);
    const myClonedBigInt = deepClone(myBigInt);
    const myClonedBoolean = deepClone(myBoolean);
    const myClonedNull = deepClone(myNull);
    const myClonedUndefined = deepClone(myUndefined);

    expect(myClonedString).eq(myString);
    expect(myClonedNumber).eq(myNumber);
    expect(myClonedBigInt).eq(myBigInt);
    expect(myClonedBoolean).eq(myBoolean);
    expect(myClonedNull).eq(myNull);
    expect(myClonedUndefined).eq(myUndefined);
  });

  it("deepClone", () => {
    const myObject = {
      name: "John",
      data: {
        some: {
          value: {
            hello: true,
            someArray: [{ name: "some name", data: { data: { hello: "some data" } } }, new Set([Buffer.from("Hello WORLD"), 4, "a", false])],
          },
        },
      },
    } as const;

    const myClonedObject = deepClone(myObject);

    expect(myClonedObject).not.eq(myObject);
    expect(myClonedObject).deep.eq(myObject);

    expect(myClonedObject.data.some.value.someArray[0].data.data).not.eq(myObject.data.some.value.someArray[0].data.data);
    expect(myClonedObject.data.some.value.someArray[0].data.data).deep.eq(myObject.data.some.value.someArray[0].data.data);
  });
});
