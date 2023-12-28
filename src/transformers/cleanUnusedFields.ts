import { isJsObject } from "../types/attributes/object";
import { nativeTypeToDDBType } from "../common/nativeTypeToDDBType";
import { findMatchedNestableUnionTypes, findBestMatch } from "../common/predictUnionMatchedType";

export const cleanUnusedFields = (Schema, item: any) => {
  if (Schema.type == "M" && isJsObject(item)) {
    const keys = Object.keys(item);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      if (!(key in Schema.fields)) {
        if (!Schema.allowUndeclared) {
          delete item[key];
        }
      } else {
        cleanUnusedFields(Schema.fields[key], item[key]);
      }
    }
  } else if (Schema.type == "L" && Array.isArray(item)) {
    for (let i = 0; i < item.length; i++) {
      const element = item[i];
      cleanUnusedFields(Schema.items, element);
    }
  } else if (Array.isArray(Schema.type)) {
    const marshalledType = nativeTypeToDDBType(item);
    const matchedTypes = findMatchedNestableUnionTypes(Schema, marshalledType);

    if (!matchedTypes.length) {
      return;
    }
    if (matchedTypes.length == 1) {
      cleanUnusedFields(matchedTypes[0], item);
    } else {
      cleanUnusedFields(findBestMatch(matchedTypes, item, marshalledType), item);
    }
  }
};
