import { nativeTypeToDDBType } from "../common/nativeTypeToDDBType";
import { predictTypeFromUnion } from "../common/predictUnionMatchedType";

// this function normalizes Buffer, BigInt and Date attributes
export const applySchemaDefinedTypes = (Schema, Item) => {
  const marshalledType = nativeTypeToDDBType(Item);

  if (marshalledType == "B") {
    return Buffer.from(Item);
  }

  let s = Schema;

  if (Array.isArray(Schema.type)) {
    s = predictTypeFromUnion(Schema.type, Item);
  }

  if (s.type == "N" && s.format == "bigint" && typeof Item == "number") {
    return BigInt(Item);
  }

  if (s.type == "D" && marshalledType == "N") {
    return new Date(s.format == "EPOCH" ? Item * 1000 : Item);
  } else if (s.type == "DS" && marshalledType == "NS" && Item instanceof Set) {
    const items = Array.from(Item.values());

    if (s.items.format == "EPOCH") {
      return new Set(items.map((x) => new Date(x * 1000)));
    } else {
      return new Set(items.map((x) => new Date(x)));
    }
  }

  if (s.items) {
    if (Item instanceof Set) {
      const items = Array.from(Item.values());

      return new Set(items.map((x) => applySchemaDefinedTypes(s.items, x)));
    }

    if (marshalledType == "L") {
      return Item.map((x) => applySchemaDefinedTypes(s.items, x));
    }
  }

  if (s.fields && marshalledType == "M") {
    const keys = Object.keys(Item);

    for (const key of keys) {
      if (s.fields[key]) {
        Item[key] = applySchemaDefinedTypes(s.fields[key], Item[key]);
      }
    }
  }

  return Item;
};
