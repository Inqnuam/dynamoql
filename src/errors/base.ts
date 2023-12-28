export class DynamoQLException extends Error {
  constructor(error?: string) {
    super(error);
  }
}

export class DynamoQLForbiddenOperationException extends DynamoQLException {
  TableName: string;
  constructor(tableName: string, error: string) {
    super(error);
    this.TableName = tableName;
  }
}

export class DynamoQLValidatorException extends DynamoQLException {
  TableName: string;
  details: Record<string, string> = {};
  constructor(tableName: string, error: string) {
    super(error);
    this.TableName = tableName;
  }
  get length() {
    return Object.keys(this.details).length;
  }
  add(keyPath: string, message: string) {
    let path = keyPath;
    if (path.startsWith(".")) {
      path = path.slice(1);
    }
    this.details[path] = message;
  }
  merge(err: DynamoQLValidatorException) {
    this.details = { ...this.details, ...err.details };
  }
  toJSON() {
    return this.details;
  }
}
