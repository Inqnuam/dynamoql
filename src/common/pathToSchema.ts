import { DynamoQLException } from "../errors/base";

const genericAny = { type: "ANY", allowUndeclared: true };
const genericUndefined = { type: "undefined" };

const getTopField = (path: string, rest: string) => {
  if (path.startsWith("[")) {
    const [topField, ...rest] = path.split("]");

    return [`${topField}]`, rest.join("]")];
  }

  const leftBracket = path.indexOf("[");
  const point = path.indexOf(".");

  if (leftBracket == point) {
    return [path, rest];
  }

  if (point == -1 || (leftBracket > -1 && leftBracket < point)) {
    const [, ...rest] = path.split("[");

    return [path.slice(0, leftBracket), `[${rest.join("[")}`];
  } else {
    const [topField, ...rest] = path.split(".");

    return [topField, rest.join(".")];
  }
};

export const pathToSchema = (Schema: any, path: string) => {
  const [topField, childs] = getTopField(path, "");

  if (Schema.fields?.[topField]) {
    if (childs) {
      return pathToSchema(Schema.fields[topField], childs);
    }
    return Schema.fields[topField];
  } else if (Schema.items && topField.endsWith("]")) {
    if (topField.includes("#")) {
      throw new DynamoQLException("'[#]' is a placeholder. Please use a real number.");
    } else {
      return pathToSchema(Schema.items, childs.startsWith(".") ? childs.slice(1) : childs);
    }
  }

  if (Schema.type == "M" && !Schema.fields[topField]) {
    return Schema.allowUndeclared ? genericAny : genericUndefined;
  }

  return Schema;
};
