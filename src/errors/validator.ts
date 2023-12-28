import { DynamoQLValidatorException } from "./base";

export class DynamoQLInvalidTypeException extends DynamoQLValidatorException {
  constructor(tableName: string) {
    super(tableName, "Invalid Type");
  }
}

export class DynamoQLMissingKeyException extends DynamoQLValidatorException {
  constructor(tableName: string) {
    super(tableName, "Missing Key");
  }
}

export class DynamoQLInvalidEnumException extends DynamoQLValidatorException {
  constructor(tableName: string) {
    super(tableName, "Invalid enum value");
  }
}

export class DynamoQLInvalidMinMaxException extends DynamoQLValidatorException {
  constructor(tableName: string) {
    super(tableName, "Invalid min/max value");
  }
}
export class DynamoQLCustomValidatorException extends DynamoQLValidatorException {
  constructor(tableName: string) {
    super(tableName, "Custom validator exception");
  }
}
