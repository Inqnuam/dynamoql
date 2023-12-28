import { nativeTypeToDDBType } from "../common/nativeTypeToDDBType";
import { predictTypeFromUnion } from "../common/predictUnionMatchedType";

export const applyGetTransformers = async (Schema, self, item, getterInfo) => {
  const marshalledType = nativeTypeToDDBType(self);

  if (marshalledType == "B") {
    self = Buffer.from(self);
  }

  let s = Schema;

  if (Array.isArray(Schema.type)) {
    s = predictTypeFromUnion(Schema.type, self);
  }
  if (s.type == "N" && s.format == "bigint" && typeof self == "number") {
    self = BigInt(self);
  }

  if (s.type == "D" && marshalledType == "N") {
    self = new Date(s.format == "EPOCH" ? self * 1000 : self);
  } else if (s.type == "DS" && marshalledType == "NS" && self instanceof Set) {
    const items = Array.from(self.values());

    if (s.items.format == "EPOCH") {
      self = new Set(items.map((x) => new Date(x * 1000)));
    } else {
      self = new Set(items.map((x) => new Date(x)));
    }
  }

  if (marshalledType != s.type || (s.type == "DS" && marshalledType != "NS")) {
    return self;
  }

  if (typeof s.get == "function") {
    self = await s.get(self, item, getterInfo);
  }

  if (s.type == "M") {
    const keys = Object.keys(self);
    for (let i = 0; i < keys.length; i++) {
      const fieldName = keys[i];

      if (s.fields[fieldName]) {
        self[fieldName] = await applyGetTransformers(s.fields[fieldName], self[fieldName], item, getterInfo);
      }
    }
  } else if (s.type == "L") {
    for (let i = 0; i < self.length; i++) {
      self[i] = await applyGetTransformers(s.items, self[i], item, getterInfo);
    }
  } else if (s.items) {
    const transformedSet = new Set([]);

    for (const setItem of self.values()) {
      const transformedValue = await applyGetTransformers(s.items, setItem, item, getterInfo);
      transformedSet.add(transformedValue);
    }

    self = transformedSet;
  }

  return self;
};
