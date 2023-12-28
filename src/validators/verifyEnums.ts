import { AnySchema } from "../types/schema";
import { isJsObject } from "../types/attributes/object";
import { nativeTypeToDDBType } from "../common/nativeTypeToDDBType";

import { DynamoQLInvalidEnumException } from "../errors/validator";

export function verifyEnums(Schema: AnySchema, item: any, nestedPath: string, errors: DynamoQLInvalidEnumException) {
  if (typeof item == "undefined") {
    return;
  }

  if (Array.isArray(Schema.enum) && Schema.enum.indexOf(item) == -1) {
    errors.add(nestedPath, `Value '${item}' at '${nestedPath}' do not satisfies enum ${Schema.enum.join(" | ")}`);
  }

  if (Schema.type == "M" && Schema.fields && isJsObject(item)) {
    const keys = Object.keys(Schema.fields);

    for (let i = 0; i < keys.length; i++) {
      const childFieldName = keys[i];

      verifyEnums(Schema.fields[childFieldName], item[childFieldName], `${nestedPath}.${childFieldName}`, errors);
    }
  } else if (Schema.type == "L" && Schema.items && Array.isArray(item)) {
    for (let i = 0; i < item.length; i++) {
      verifyEnums(Schema.items, item[i], `${nestedPath}[${i}]`, errors);
    }
  } else if (typeof Schema.type == "string" && Schema.type.length == 2 && Schema.items && item instanceof Set) {
    // Set type

    const values = Array.from(item.values());

    for (let i = 0; i < values.length; i++) {
      verifyEnums(Schema.items, values[i], `${nestedPath}[${i}]`, errors);
    }
  } else if (Array.isArray(Schema.type)) {
    const marshalledType = nativeTypeToDDBType(item);
    let unionErrors = new DynamoQLInvalidEnumException(errors.TableName);
    let errLen = Infinity;

    for (let i = 0; i < Schema.type.length; i++) {
      const u = Schema.type[i];
      if (u.type != marshalledType) {
        continue;
      }
      const err = new DynamoQLInvalidEnumException(errors.TableName);
      verifyEnums(u, item, nestedPath, err);

      if (err.length <= errLen) {
        errLen = err.length;
        unionErrors = err;
      }
    }

    if (unionErrors.length) {
      errors.merge(unionErrors);
    }
  }
}
