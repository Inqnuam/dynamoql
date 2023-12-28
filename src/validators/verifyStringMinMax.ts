import { AnySchema } from "../types/schema";
import { isNumber } from "../types/attributes/number";
import { isJsObject } from "../types/attributes/object";
import { nativeTypeToDDBType } from "../common/nativeTypeToDDBType";
import { DynamoQLInvalidMinMaxException } from "../errors/validator";

export const verifyMinMax = (Schema: AnySchema, item: any, nestedPath: string, errors: DynamoQLInvalidMinMaxException) => {
  if (typeof item == "undefined") {
    return;
  }

  if (Schema.type == "S" && typeof item == "string") {
    if ("minLength" in Schema && item.length < Schema.minLength) {
      errors.add(nestedPath, `expected to have minimum length of ${Schema.minLength}. Received: ${item.length}`);
    }

    if ("maxLength" in Schema && item.length > Schema.maxLength) {
      errors.add(nestedPath, `expected to have maximum length of ${Schema.minLength}. Received: ${item.length}`);
    }
  } else if (Schema.type == "N" && isNumber(item)) {
    if ("min" in Schema && item < Schema.min) {
      errors.add(nestedPath, `expected to be at least ${Schema.min}. Received: ${item}`);
    }

    if ("max" in Schema && item > Schema.max) {
      errors.add(nestedPath, `expected to be maximum ${Schema.max}. Received: ${item}`);
    }
  } else if (Schema.type == "B" && item instanceof Buffer) {
    if ("min" in Schema && item.length < Schema.min) {
      errors.add(nestedPath, `expected to have minimum size of ${Schema.min}. Received: ${item.length}`);
    }

    if ("max" in Schema && item.length > Schema.max) {
      errors.add(nestedPath, `expected to be maximum size of ${Schema.max}. Received: ${item.length}`);
    }
  } else if (Schema.type == "D") {
    //
    const date = new Date(Schema.format == "EPOCH" ? item * 1000 : item);
    // @ts-ignore
    if ("min" in Schema && date < Schema.min) {
      errors.add(nestedPath, `expected to be at least ${Schema.min}. Received: ${date}`);
    }
    // @ts-ignore
    if ("max" in Schema && date > Schema.max) {
      errors.add(nestedPath, `expected to be maximum ${Schema.max}. Received: ${date}`);
    }
  } else if (Schema.type == "M" && Schema.fields && isJsObject(item)) {
    const keys = Object.keys(Schema.fields);

    for (let i = 0; i < keys.length; i++) {
      const childFieldName = keys[i];

      verifyMinMax(Schema.fields[childFieldName], item[childFieldName], `${nestedPath}.${childFieldName}`, errors);
    }
  } else if (Schema.type == "L" && Schema.items && Array.isArray(item)) {
    for (let i = 0; i < item.length; i++) {
      verifyMinMax(Schema.items, item[i], `${nestedPath}[${i}]`, errors);
    }
  } else if (typeof Schema.type == "string" && Schema.type.length == 2 && Schema.items && item instanceof Set) {
    // Set type

    const values = Array.from(item.values());

    for (let i = 0; i < values.length; i++) {
      verifyMinMax(Schema.items, values[i], `${nestedPath}[${i}]`, errors);
    }
  } else if (Array.isArray(Schema.type)) {
    const marshalledType = nativeTypeToDDBType(item);

    let unionErrors = new DynamoQLInvalidMinMaxException(errors.TableName);
    let errLen = Infinity;

    for (let i = 0; i < Schema.type.length; i++) {
      const u = Schema.type[i];
      if (u.type != marshalledType) {
        continue;
      }
      const err = new DynamoQLInvalidMinMaxException(errors.TableName);
      verifyMinMax(u, item, nestedPath, err);

      if (err.length <= errLen) {
        errLen = err.length;
        unionErrors = err;
      }
    }

    if (unionErrors.length) {
      errors.merge(unionErrors);
    }
  }
};
