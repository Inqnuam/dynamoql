import { DynamoQLException } from "../errors/base";
import {
  ConditionExpression,
  lessThan,
  lessThanOrEqualTo,
  greaterThan,
  greaterThanOrEqualTo,
  notEquals,
  equals,
  between,
  inList,
  attributeExists,
  attributeNotExists,
  attributeType,
  beginsWith,
  contains,
  AttributePath,
} from "../expressions";
import { getDateTimestamp } from "../types/attributes/date";
import { isNumber } from "../types/attributes/number";
import { isJsObject } from "../types/attributes/object";
import { getDbType } from "./getDdbType";

type cond = { [key: string]: (Schema, subject: any, value: any) => ConditionExpression };

const conditions: cond = {
  $and: andCondition,
  $or: orCondition,
  $not: notCondition,
  $eq: eqCondition,
  $neq: neqCondition,
  $gt: gtCondition,
  $gte: gteCondition,
  $lt: ltCondition,
  $lte: lteCondition,
  $in: inCondition,
  $between: betweenCondition,
  $size: sizeCondition,
  $includes: containsCondition,
  $exists: existsCondition,
  $type: typeCondition,
  $startsWith: beginsWithCondition,
};

const sizeOperators = {
  $eq: equals,
  $neq: notEquals,
  $gt: greaterThan,
  $gte: greaterThanOrEqualTo,
  $lt: lessThan,
  $lte: lessThanOrEqualTo,
  $in: inList,
  $between: (values) => {
    if (!Array.isArray(values) || values.length != 2 || !values.every(isNumber)) {
      throw new DynamoQLException(`$between condition for "$size" must include exactly two numbers/bigint.`);
    }

    return between(values[0], values[1]);
  },
};

const getConditions = (Schema, subject: string, values: any[], cmd: "$and" | "$or"): ConditionExpression[] => {
  const conditions = [];

  for (const val of values) {
    const result = getConditionExpressions(Schema, val, subject);

    if (result === undefined) {
      throw new DynamoQLException(`'${subject}' > '${cmd}' condition can not have 'undefined' condition.`);
    }

    conditions.push(result);
  }

  if (!conditions.length) {
    throw new DynamoQLException(`'${subject}' > '${cmd}' condition can not be empty array.`);
  }

  return conditions;
};

function andCondition(Schema, subject: string, values: any[]): ConditionExpression {
  return {
    type: "And",
    conditions: getConditions(Schema, subject, values, "$and"),
  };
}
function orCondition(Schema, subject: string, values: any[]): ConditionExpression {
  return {
    type: "Or",
    conditions: getConditions(Schema, subject, values, "$or"),
  };
}
function notCondition(Schema, subject: string, value: any): ConditionExpression {
  return {
    type: "Not",
    condition: getConditionExpressions(Schema, value, subject),
  };
}
function eqCondition(Schema, subject: string | AttributePath, value: any): ConditionExpression {
  return {
    subject,
    ...equals(value),
  };
}
function neqCondition(Schema, subject: string | AttributePath, value: any): ConditionExpression {
  return {
    subject,
    ...notEquals(value),
  };
}

function gtCondition(Schema, subject: string | AttributePath, value: any): ConditionExpression {
  return {
    subject,
    ...greaterThan(value),
  };
}
function gteCondition(Schema, subject: string | AttributePath, value: any): ConditionExpression {
  return {
    subject,
    ...greaterThanOrEqualTo(value),
  };
}
function ltCondition(Schema, subject: string | AttributePath, value: any): ConditionExpression {
  return {
    subject,
    ...lessThan(value),
  };
}
function lteCondition(Schema, subject: string | AttributePath, value: any): ConditionExpression {
  return {
    subject,
    ...lessThanOrEqualTo(value),
  };
}
function inCondition(Schema, subject: string | AttributePath, value: any): ConditionExpression {
  if (!Array.isArray(value) || !value.length || value.some((x) => x === undefined)) {
    throw new DynamoQLException(`'${subject}' > '$in' condition must include at least one defined value.`);
  }

  return {
    subject,
    ...inList(value),
  };
}

function betweenCondition(Schema, subject: string | AttributePath, values: any[]): ConditionExpression {
  if (!Array.isArray(values) || values.length != 2 || values.some((x) => x === undefined)) {
    throw new DynamoQLException(`'${subject}' > '$between' condition must include exactly two defined values.`);
  }

  const [first, second] = values;

  return {
    subject,
    ...between(first, second),
  };
}

function sizeCondition(Schema, subject: string, value: any): ConditionExpression {
  let condition: any = equals(value);

  if (isJsObject(value)) {
    // Numeric conditions
    const keys = Object.keys(value);

    if (!keys.length) {
      throw new DynamoQLException(`$size condition for '${subject}' must contain at least one of comparison operator ($eq, $neq, $gt, $gte, $lt, $lte, $in)`);
    }

    if (keys.length == 1) {
      const comparator = keys[0];
      const resolvedComparator = sizeOperators[comparator];

      if (typeof resolvedComparator != "function") {
        throw new DynamoQLException(`${subject} > $size > '${comparator}' is not a valid comparison operator`);
      }

      condition = sizeOperators[comparator](value[comparator]);
    } else {
      const $andSize = {
        $and: keys.map((field) => {
          return {
            $size: {
              [field]: value[field],
            },
          };
        }),
      };

      return getConditionExpressions(Schema, $andSize, subject);
    }
  }

  return { type: "Function", name: "size", subject: subject, condition };
}
function containsCondition(Schema, subject: string | AttributePath, value: any): ConditionExpression {
  return {
    subject,
    ...contains(value),
  };
}
function existsCondition(Schema, subject: string | AttributePath, value: boolean): ConditionExpression {
  if (value === true) {
    return {
      subject,
      ...attributeExists(),
    };
  } else {
    return {
      subject,
      ...attributeNotExists(),
    };
  }
}

function typeCondition(Schema, subject: string | AttributePath, value: any): ConditionExpression {
  let t = getDbType(value);

  if (t == "D") {
    t = "N";
  } else if (t == "DS") {
    t = "NS";
  }

  return {
    subject,
    ...attributeType(t),
  };
}
function beginsWithCondition(Schema, subject: string | AttributePath, value: any): ConditionExpression {
  return {
    subject,
    ...beginsWith(value),
  };
}

const normalizeDateCondValue = (Schema, keyPath: string, condValue: any) => {
  const foundType = Schema.getTypeFromKeyPath(keyPath);
  if (foundType.type == "D") {
    if (Array.isArray(condValue)) {
      const items = [];

      const normalizeTs = foundType.format == "EPOCH" ? (ts) => Math.floor(ts / 1000) : (ts) => ts;
      for (const v of condValue) {
        const ts = getDateTimestamp(foundType, v);

        items.push(isNaN(ts) ? v : normalizeTs(ts));
      }

      return items;
    } else if (condValue instanceof Date || typeof condValue == "string" || typeof condValue == "number") {
      const ts = getDateTimestamp(foundType, condValue);

      if (isNaN(ts)) {
        return ts;
      }

      return foundType.format == "EPOCH" ? Math.floor(ts / 1000) : ts;
    }
    return condValue;
  } else {
    return condValue;
  }
};

export function getConditionExpressions(Schema, $if: Record<string, any>, _rawPath?: string): ConditionExpression | any {
  const conditionExpr = $if ?? {};

  const keys = Object.keys(conditionExpr);

  const rawPath = _rawPath;
  if (keys.length > 1) {
    const $and = [];

    for (const key of keys) {
      $and.push({
        [key]: conditionExpr[key],
      });
    }

    return getConditionExpressions(Schema, { $and }, rawPath);
  } else if (keys.length == 1) {
    const conditionName = keys[0];
    let condValue = conditionExpr[conditionName];

    if (condValue === undefined) {
      const attributeMsgPath = rawPath && conditionName ? `'${rawPath}' > '${conditionName}'` : `'${conditionName}'`;
      throw new DynamoQLException(`${attributeMsgPath} can not use 'undefined' as condition value.`);
    }

    if (!conditionName.startsWith("$")) {
      let currentPath = conditionName;
      if (rawPath) {
        if (conditionName.startsWith("[") && conditionName.endsWith("]")) {
          currentPath = `${rawPath}${conditionName}`;
        } else {
          currentPath = `${rawPath}.${conditionName}`;
        }
      }

      if (isJsObject(condValue)) {
        // continue deep parsing
        return getConditionExpressions(Schema, condValue, currentPath);
      } else {
        // equality check

        if (condValue) {
          condValue = normalizeDateCondValue(Schema, currentPath, condValue);
        }

        return conditions.$eq(Schema, currentPath, condValue);
      }
    } else {
      const resolveCondition = conditions[conditionName] as Function;
      if (typeof resolveCondition == "function") {
        if (condValue && typeof rawPath == "string") {
          condValue = normalizeDateCondValue(Schema, rawPath, condValue);
        }
        return resolveCondition(Schema, rawPath, condValue);
      } else {
        throw new DynamoQLException(`Unknown operator '${conditionName}'\nAllowed operators: ${Object.keys(conditions).join(", ")}`);
      }
    }
  } else if (_rawPath) {
    new DynamoQLException(`Invalid condition expression at "${_rawPath}".\nCondition expression can not be empty`);
  }
}
