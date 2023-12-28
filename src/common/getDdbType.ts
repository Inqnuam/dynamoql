import { DynamoQLException } from "../errors/base";
import { AttributeType } from "../expressions";
import { isJsObject } from "../types/attributes/object";

const SET_TYPES = new Set(["S", "N", "B", "D"]);

export const STRING_TO_DDB_TYPE = {
  String: "S",
  S: "S",
  Number: "N",
  N: "N",
  Date: "D",
  D: "D",
  BigInt: "N",
  bigint: "N",
  Boolean: "BOOL",
  BOOL: "BOOL",
  Buffer: "B",
  B: "B",
  Object: "M",
  M: "M",
  ANY: "M", // custom type for 'any'
  Array: "L",
  L: "L",
  Set: "xS",
  SS: "SS",
  NS: "NS",
  BS: "BS",
  null: "NULL",
  NULL: "NULL",
  Null: "NULL",
};

const getTypeFromDirectDeclaration = (field: any) => {
  if (Array.isArray(field)) {
    const parsedUnionTypes = [];
    for (let i = 0; i < field.length; i++) {
      const t = field[i];
      const foundType = getDbType(t);

      if (isJsObject(t)) {
        t.type = foundType;
        parsedUnionTypes.push(t);
      } else {
        parsedUnionTypes.push({ type: foundType });
      }
    }

    return parsedUnionTypes;
  }

  if (field === null) {
    return "NULL";
  }

  if (typeof field == "string") {
    const t = STRING_TO_DDB_TYPE[field];

    if (!t) {
      throw new DynamoQLException(`Unkown type '${field}'`);
    }

    return t;
  }

  if (typeof field == "function") {
    if (field.isNull) {
      return "NULL";
    }

    const foundType = STRING_TO_DDB_TYPE[field.name];
    if (!foundType) {
      throw new DynamoQLException(`Unkown type '${field}'`);
    }

    return foundType;
  }
};

export const getDbType = (field: any): AttributeType => {
  const t = getTypeFromDirectDeclaration(field);

  if (t) {
    return t;
  }

  if (isJsObject(field) && "type" in field) {
    let t = getTypeFromDirectDeclaration(field.type);
    if (!t) {
      throw new DynamoQLException(`Unkown type '${field.type}'`);
    }
    // @ts-ignore
    if (t == "xS") {
      if (!field.items) {
        throw new DynamoQLException(`'Set' type must provide 'items' type`);
      }

      const i = getTypeFromDirectDeclaration(isJsObject(field.items) ? field.items.type : field.items);

      if (!SET_TYPES.has(i)) {
        throw new DynamoQLException(`Invalid 'Set' 'items' type '${i}'\nMust be String | Number | Buffer`);
      }

      t = `${i}S`;
    }

    return t;
  }
};
