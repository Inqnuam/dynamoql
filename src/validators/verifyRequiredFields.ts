import { AnySchema } from "../types/schema";
import { isJsObject } from "../types/attributes/object";
import { nativeTypeToDDBType } from "../common/nativeTypeToDDBType";
import { DynamoQLMissingKeyException } from "../errors/validator";

export function verifyRequiredFields(Schema: AnySchema, item: any, keyPath: string, errors: DynamoQLMissingKeyException) {
  if (Schema.required && typeof item == "undefined") {
    errors.add(keyPath, "is required");
  }

  if (Schema.type == "M" && Schema.fields && isJsObject(item)) {
    const keys = Object.keys(Schema.fields);

    for (let i = 0; i < keys.length; i++) {
      const childFieldName = keys[i];

      verifyRequiredFields(Schema.fields[childFieldName], item[childFieldName], `${keyPath}.${childFieldName}`, errors);
    }
  } else if (Schema.type == "L" && Schema.items && Array.isArray(item)) {
    for (let i = 0; i < item.length; i++) {
      verifyRequiredFields(Schema.items, item[i], `${keyPath}[${i}]`, errors);
    }
  } else if (Array.isArray(Schema.type)) {
    const marshalledType = nativeTypeToDDBType(item);
    let unionErrors = new DynamoQLMissingKeyException(errors.TableName);
    let errLen = Infinity;

    for (let i = 0; i < Schema.type.length; i++) {
      const u = Schema.type[i];
      if (u.type != marshalledType) {
        continue;
      }
      const err = new DynamoQLMissingKeyException(errors.TableName);
      verifyRequiredFields(u, item, keyPath, err);

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
