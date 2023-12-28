import { AnySchema } from "../types/schema";
import { isJsObject } from "../types/attributes/object";
import { predictTypeFromUnion } from "../common/predictUnionMatchedType";
import { deepClone } from "../common/deepClone";
import { convertMapToJsObject } from "./convertMapToJsObject";

export async function setDefaultFields(Schema: AnySchema, putItem: any, self?: any): Promise<any> {
  let customSelf = self ?? putItem;
  let newValue: any | undefined = convertMapToJsObject(putItem);

  if ("default" in Schema && typeof putItem == "undefined") {
    if (typeof Schema.default == "function") {
      const defaultAsFunc = Schema.default as Function;
      const defaultValue = await defaultAsFunc(customSelf);
      if (typeof defaultValue != "undefined") {
        newValue = defaultValue;
      }
    } else {
      newValue = deepClone(Schema.default);
    }
  }

  if (Schema.type == "M" && Schema.fields && isJsObject(newValue)) {
    newValue = { ...newValue };

    const keys = Object.keys(Schema.fields);

    for (let i = 0; i < keys.length; i++) {
      const childFieldName = keys[i];

      const defaultChildValue = await setDefaultFields(Schema.fields[childFieldName], newValue[childFieldName], customSelf);

      if (typeof defaultChildValue != "undefined") {
        newValue[childFieldName] = defaultChildValue;
      }
    }
  } else if (Schema.type == "L" && Schema.items && Array.isArray(newValue)) {
    newValue = [...newValue];
    for (let i = 0; i < newValue.length; i++) {
      newValue[i] = await setDefaultFields(Schema.items, newValue[i], customSelf);
    }
  } else if (Array.isArray(Schema.type)) {
    // union type

    const foundType = predictTypeFromUnion(Schema.type, newValue);

    if (foundType) {
      newValue = await setDefaultFields(foundType, newValue);
    }
  }

  return newValue;
}
