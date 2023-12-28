import { AnySchema } from "../types/schema";
import { isJsObject } from "../types/attributes/object";
import { nativeTypeToDDBType } from "../common/nativeTypeToDDBType";
import { DynamoQLInvalidTypeException } from "../errors/validator";
import { getDateTimestamp } from "../types/attributes/date";

export const verifyTypes = (Schema: AnySchema, item: any, nestedPath: string, errors: DynamoQLInvalidTypeException) => {
  if (Schema.type == "ANY") {
    return;
  }

  if (typeof item == "undefined") {
    return;
  }

  const marshalledType = nativeTypeToDDBType(item);

  if (Array.isArray(Schema.type)) {
    const foundType = Schema.type.find((x) => x.type == marshalledType);
    if (!foundType) {
      errors.add(nestedPath, `Excepted: ${Schema.type.map((x) => x.type).join(" | ")}. Received: ${marshalledType}`);
      return;
    } else {
      let unionErrors = new DynamoQLInvalidTypeException(errors.TableName);
      let errLen = Infinity;

      for (let i = 0; i < Schema.type.length; i++) {
        const u = Schema.type[i];
        if (u.type != marshalledType) {
          continue;
        }
        const err = new DynamoQLInvalidTypeException(errors.TableName);
        verifyTypes(u, item, nestedPath, err);

        if (err.length <= errLen) {
          errLen = err.length;
          unionErrors = err;
        }
      }

      if (unionErrors.length) {
        errors.merge(unionErrors);
      }
    }
  } else if (marshalledType != Schema.type) {
    if (Schema.type == "D") {
      if (isNaN(getDateTimestamp(Schema, item))) {
        errors.add(nestedPath, `Excepted to be a valid date. Received: ${marshalledType} - ${item}`);
        return;
      }
    } else if (Schema.type == "DS" && marshalledType == "NS") {
      return;
    } else {
      errors.add(nestedPath, `Excepted: ${Schema.type}. Received: ${marshalledType}`);
      return;
    }
  }

  if (Schema.type == "M" && Schema.fields && isJsObject(item)) {
    const keys = Object.keys(Schema.fields);

    for (let i = 0; i < keys.length; i++) {
      const childFieldName = keys[i];
      verifyTypes(Schema.fields[childFieldName], item[childFieldName], `${nestedPath}.${childFieldName}`, errors);
    }
  } else if (Schema.type == "L" && Schema.items && Array.isArray(item)) {
    for (let i = 0; i < item.length; i++) {
      verifyTypes(Schema.items, item[i], `${nestedPath}[${i}]`, errors);
    }
  }
};
