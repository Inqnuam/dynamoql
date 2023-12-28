import { AnySchema } from "../types/schema";
import { isJsObject } from "../types/attributes/object";
import { predictTypeFromUnion } from "../common/predictUnionMatchedType";
import { getDateTimestamp } from "../types/attributes/date";

export const applyCustomSetters = async (Schema: AnySchema, item: any, self: any, setterInfo: any) => {
  if (typeof item == "undefined") {
    return;
  }

  let newValue = item;

  //

  if (Schema.type == "D") {
    // to pass Date instanece to custom setter
    newValue = new Date(getDateTimestamp(Schema, item));
  } else if (Schema.type == "DS" && item instanceof Set) {
    newValue = new Set(Array.from(item.values()).map((x) => new Date(getDateTimestamp(Schema.items, x))));
  }

  if (typeof Schema.set == "function") {
    newValue = await Schema.set(item, self, setterInfo);
  }

  if (newValue) {
    if (Schema.type == "D") {
      const d = getDateTimestamp(Schema, newValue);
      return Schema.format == "EPOCH" ? Math.floor(d / 1000) : d;
    } else if (Schema.type == "DS" && newValue instanceof Set) {
      const items = Array.from(newValue.values());

      if (Schema.format == "EPOCH") {
        newValue = new Set(items.map((x) => Math.floor(getDateTimestamp(Schema.items, x) / 1000)));
      } else {
        newValue = new Set(items.map((x) => getDateTimestamp(Schema.items, x)));
      }
    }
  }

  if (Schema.type == "M" && Schema.fields && isJsObject(newValue)) {
    const keys = Object.keys(Schema.fields);

    for (let i = 0; i < keys.length; i++) {
      const childFieldName = keys[i];

      const transformedValue = await applyCustomSetters(Schema.fields[childFieldName], newValue[childFieldName], self, setterInfo);

      if (typeof transformedValue != "undefined") {
        newValue[childFieldName] = transformedValue;
      } else if (childFieldName in newValue) {
        newValue[childFieldName] = undefined;
      }
    }
  } else if (Schema.type == "L" && Schema.items && Array.isArray(newValue)) {
    for (let i = 0; i < newValue.length; i++) {
      newValue[i] = await applyCustomSetters(Schema.items, newValue[i], self, setterInfo);
    }
  } else if (typeof Schema.type == "string" && Schema.type.length == 2 && Schema.items && newValue instanceof Set) {
    // Set type

    const values = Array.from(item.values());

    for (let i = 0; i < values.length; i++) {
      const transformedValue = await applyCustomSetters(Schema.items, values[i], self, setterInfo);

      newValue.delete(values[i]);

      if (typeof transformedValue != "undefined") {
        newValue.add(transformedValue);
      }
    }
  } else if (Array.isArray(Schema.type)) {
    // union type

    const foundType = predictTypeFromUnion(Schema.type, item);
    if (foundType) {
      newValue = await applyCustomSetters(foundType, item, self, setterInfo);
    }
  }

  return newValue;
};
