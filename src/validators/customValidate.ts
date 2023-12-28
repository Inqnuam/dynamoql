import { isJsObject } from "../types/attributes/object";
import { AnySchema } from "../types/schema";
import { predictTypeFromUnion } from "../common/predictUnionMatchedType";

import { DynamoQLCustomValidatorException } from "../errors/validator";

export const customValidate = async (Schema: AnySchema, item: any, nestedPath: string, errors: DynamoQLCustomValidatorException) => {
  if (typeof item == "undefined") {
    return;
  }

  let s = Schema;

  if (Array.isArray(Schema)) {
    s = predictTypeFromUnion(Schema, item);
  }

  if (!s) {
    return;
  }

  if (typeof s.validate == "function") {
    const errMsg = await s.validate(item);

    if (errMsg && typeof errMsg == "string") {
      errors.add(nestedPath, errMsg);
    }
  }

  if (s.type == "M" && s.fields && isJsObject(item)) {
    const keys = Object.keys(s.fields);

    for (let i = 0; i < keys.length; i++) {
      const childFieldName = keys[i];

      if (childFieldName in item) {
        await customValidate(s.fields[childFieldName], item[childFieldName], `${nestedPath}.${childFieldName}`, errors);
      }
    }
  } else if (s.type == "L" && Array.isArray(item)) {
    for (let i = 0; i < item.length; i++) {
      await customValidate(s.items, item[i], `${nestedPath}[${i}]`, errors);
    }
  } else if (typeof s.type == "string" && s.type.length == 2 && s.items && typeof s.items.validate == "function" && item instanceof Set) {
    const values = Array.from(item.values());

    for (let i = 0; i < values.length; i++) {
      const element = values[i];

      const errMsg = await s.items.validate(element);

      if (errMsg && typeof errMsg == "string") {
        errors.add(`${nestedPath}[${i}]`, errMsg);
      }
    }
  } else if (Array.isArray(s.type)) {
    const foundType = predictTypeFromUnion(s.type, item);
    if (foundType) {
      await customValidate(foundType, item, nestedPath, errors);
    }
  }
};
