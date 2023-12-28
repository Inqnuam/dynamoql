import {
  DynamoQLInvalidTypeException,
  DynamoQLMissingKeyException,
  DynamoQLInvalidEnumException,
  DynamoQLInvalidMinMaxException,
  DynamoQLCustomValidatorException,
} from "../errors/validator";
import { verifyEnums } from "./verifyEnums";
import { verifyRequiredFields } from "./verifyRequiredFields";
import { verifyMinMax } from "./verifyStringMinMax";
import { verifyTypes } from "./verifyTypes";
import { customValidate } from "./customValidate";

export const validate = async (schema, item, path, tableName: string) => {
  const missingFields = new DynamoQLMissingKeyException(tableName);

  verifyRequiredFields(schema, item, path, missingFields);

  if (missingFields.length) {
    throw missingFields;
  }

  const invalidTypes = new DynamoQLInvalidTypeException(tableName);
  verifyTypes(schema, item, path, invalidTypes);

  if (invalidTypes.length) {
    throw invalidTypes;
  }

  const invalidEnumValues = new DynamoQLInvalidEnumException(tableName);
  verifyEnums(schema, item, path, invalidEnumValues);

  if (invalidEnumValues.length) {
    throw invalidEnumValues;
  }

  const invalidMinMax = new DynamoQLInvalidMinMaxException(tableName);
  verifyMinMax(schema, item, path, invalidMinMax);
  if (invalidMinMax.length) {
    throw invalidMinMax;
  }

  const invalidCustomValidate = new DynamoQLCustomValidatorException(tableName);

  await customValidate(schema, item, path, invalidCustomValidate);

  if (invalidCustomValidate.length) {
    throw invalidCustomValidate;
  }
};
