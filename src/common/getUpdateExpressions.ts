import { DynamoQLForbiddenOperationException } from "../errors/base";
import { AttributePath, FunctionExpression, UpdateExpression, MathematicalExpression } from "../expressions";
import { isJsObject } from "../types/attributes/object";
import { cleanUnusedFields } from "../transformers/cleanUnusedFields";
import { validate } from "../validators/validate";
import { getDateChangedValue, getDateTimestamp } from "../types/attributes/date";
import { convertMapToJsObject } from "../transformers/convertMapToJsObject";

const isIndexAccesPath = (p: string) => p.startsWith("[");

export async function getUpdateExpressions(tableName: string, doc: any, Schema: Record<string, any>, _update?: UpdateExpression, _rawPath?: string): Promise<UpdateExpression> {
  let update = _update ?? new UpdateExpression();

  if (doc === null) {
    update.set(new AttributePath(_rawPath), null);
    return update;
  }

  for (const fieldName of Object.keys(doc)) {
    const field = convertMapToJsObject(doc[fieldName]);
    // @ts-ignore
    let rawPath = !_rawPath ? fieldName : isIndexAccesPath(fieldName) ? `${_rawPath}${fieldName}` : `${_rawPath}.${fieldName}`;

    if (fieldName.startsWith("$")) {
      rawPath = rawPath.replace(`.${fieldName}`, "");
    }

    const attrPath = new AttributePath(rawPath);

    if (isJsObject(field)) {
      if (fieldName == "$set" || fieldName == "$ifNotExists") {
        if (rawPath == fieldName) {
          // NOTE: This is Top level $set expression

          const keys = Object.keys(field);

          for (const k of keys) {
            const s = Schema.fields[k];
            if (!s) {
              throw new DynamoQLForbiddenOperationException(tableName, `Can not set "${k}" as it doesn't exists in Schema.`);
            }
            let childValue = field[k];

            cleanUnusedFields(s, childValue);
            await validate(s, childValue, k, tableName);

            if (s.type == "D") {
              childValue = getDateTimestamp(s, childValue);
              if (s.format == "EPOCH") {
                childValue = Math.floor(childValue / 1000);
              }
            } else if (s.type == "DS" && childValue instanceof Set) {
              const items = Array.from(childValue.values());
              if (s.items.format == "EPOCH") {
                childValue = new Set(items.map((x) => Math.floor(getDateTimestamp(s.items, x) / 1000)));
              } else {
                childValue = new Set(items.map((x) => getDateTimestamp(s.items, x)));
              }
            }

            const childAttrPath = new AttributePath(k);

            update.set(childAttrPath, childValue);
          }
        } else {
          const s = Schema.getTypeFromKeyPath(rawPath);

          cleanUnusedFields(s, field);
          await validate(s, field, rawPath, tableName);

          update.set(attrPath, fieldName == "$set" ? field : new FunctionExpression("if_not_exists", attrPath, field));
        }
      } else if (fieldName == "$date") {
        const s = Schema.getTypeFromKeyPath(rawPath);

        const incr = {
          $incr: getDateChangedValue(s.format == "EPOCH" ? "EPOCH" : "TIMESTAMP", field),
        };
        await getUpdateExpressions(tableName, incr, Schema, update, rawPath);
      } else {
        await getUpdateExpressions(tableName, field, Schema, update, rawPath);
      }
    } else {
      if (!fieldName.startsWith("$") || fieldName == "$set") {
        const s = Schema.getTypeFromKeyPath(rawPath);

        await validate(s, field, rawPath, tableName);

        if (s.type == "D") {
          let d = getDateTimestamp(s, field);
          if (s.format == "EPOCH") {
            d = Math.floor(d / 1000);
          }
          update.set(attrPath, d);
        } else if (s.type == "DS" && field instanceof Set) {
          let d;
          const items = Array.from(field.values());
          if (s.items.format == "EPOCH") {
            d = new Set(items.map((x) => Math.floor(getDateTimestamp(s.items, x) / 1000)));
          } else {
            d = new Set(items.map((x) => getDateTimestamp(s.items, x)));
          }
          update.set(attrPath, d);
        } else {
          update.set(attrPath, field);
        }
      } else {
        if (fieldName == "$push") {
          const pushingValue = Array.isArray(field) ? field : [field];

          const s = Schema.getTypeFromKeyPath(rawPath);
          await validate(s, pushingValue, rawPath, tableName);

          update.set(rawPath, new FunctionExpression("list_append", new AttributePath(rawPath), pushingValue));
        } else if (fieldName == "$unshift") {
          const pushingValue = Array.isArray(field) ? field : [field];

          const s = Schema.getTypeFromKeyPath(rawPath);
          await validate(s, pushingValue, rawPath, tableName);

          update.set(rawPath, new FunctionExpression("list_append", pushingValue, new AttributePath(rawPath)));
        } else if (fieldName == "$incr") {
          const s = Schema.getTypeFromKeyPath(rawPath);
          if (s.enum) {
            throw new DynamoQLForbiddenOperationException(tableName, `${rawPath} can not be used with $incr as it is an enum.`);
          }

          update.set(rawPath, new MathematicalExpression(rawPath, "+", field));
        } else if (fieldName == "$decr") {
          const s = Schema.getTypeFromKeyPath(rawPath);
          if (s.enum) {
            throw new DynamoQLForbiddenOperationException(tableName, `${rawPath} can not be used with $decr as it is an enum.`);
          }

          update.set(rawPath, new MathematicalExpression(rawPath, "-", field));
        } else if (fieldName == "$remove") {
          const pullingItems = Array.isArray(field) ? field : [field];
          const currentPath = rawPath.startsWith("$") ? "" : rawPath;

          for (let i = 0; i < pullingItems.length; i++) {
            const item = pullingItems[i];

            const nestedPath = isNaN(item) ? (currentPath ? `${currentPath}.${item}` : `${item}`) : `${currentPath}[${item}]`;

            const s = Schema.getTypeFromKeyPath(nestedPath);
            if (s.required) {
              throw new DynamoQLForbiddenOperationException(tableName, `${nestedPath} can not be removed as it is marked as 'required'.`);
            }

            update.remove(nestedPath);
          }
        } else if (fieldName == "$delete") {
          const delItem = Array.isArray(field) ? field : [field];
          update.delete(rawPath, new Set(delItem));
        } else if (fieldName == "$add") {
          const addItem = Array.isArray(field) ? field : [field];
          update.add(rawPath, new Set(addItem));
        } else if (fieldName == "$ifNotExists") {
          const s = Schema.getTypeFromKeyPath(rawPath);
          cleanUnusedFields(s, field);
          await validate(s, field, rawPath, tableName);

          update.set(rawPath, new FunctionExpression("if_not_exists", new AttributePath(rawPath), field));
        } else {
          throw new DynamoQLForbiddenOperationException(tableName, `Unknown update expression - "${fieldName}"`);
        }
      }
    }
  }

  return update;
}
