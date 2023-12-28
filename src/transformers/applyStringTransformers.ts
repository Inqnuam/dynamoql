import { AnySchema } from "../types/schema";
import { isJsObject } from "../types/attributes/object";
import { predictTypeFromUnion } from "../common/predictUnionMatchedType";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const applyStringTransformers = (Schema: AnySchema, item: any) => {
  if (typeof item == "undefined") {
    return;
  }

  let newValue = item;

  if (Schema.type == "S" && typeof newValue == "string") {
    if (Schema.trim) {
      newValue = newValue.trim();
    }

    if (Schema.lowercase) {
      newValue = newValue.toLowerCase();
    } else if (Schema.uppercase) {
      newValue = newValue.toUpperCase();
    }

    if (Schema.capitalize) {
      newValue = capitalize(newValue);
    }
  } else if (Schema.type == "M" && Schema.fields && isJsObject(newValue)) {
    const keys = Object.keys(Schema.fields);

    for (let i = 0; i < keys.length; i++) {
      const childFieldName = keys[i];

      const transformedValue = applyStringTransformers(Schema.fields[childFieldName], newValue[childFieldName]);

      if (typeof transformedValue != "undefined") {
        newValue[childFieldName] = transformedValue;
      }
    }
  } else if (Schema.type == "L" && Schema.items && Array.isArray(newValue)) {
    for (let i = 0; i < newValue.length; i++) {
      newValue[i] = applyStringTransformers(Schema.items, newValue[i]);
    }
  } else if (typeof Schema.type == "string" && Schema.type.length == 2 && Schema.items && newValue instanceof Set) {
    // Set type

    const values = Array.from(item.values());

    for (let i = 0; i < values.length; i++) {
      const transformedValue = applyStringTransformers(Schema.items, values[i]);

      if (typeof transformedValue != "undefined") {
        newValue.delete(values[i]);
        newValue.add(transformedValue);
      }
    }
  } else if (Array.isArray(Schema.type)) {
    // union type

    const foundType = predictTypeFromUnion(Schema.type, item);

    if (foundType) {
      newValue = applyStringTransformers(foundType, item);
    }
  }

  return newValue;
};
