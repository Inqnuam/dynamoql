import { AttributeProperties } from "../index";
import { CustomValidate } from "../schema";
import { CAN_NOT_USE_MULTIPLE_OPERATIONS } from "../utils";
import { AttributeTypeConditions } from "./attribute";

export interface DateProperties {
  type: DateConstructor;
  format?: "timestamp" | "EPOCH";
  default?: DateType | ((self?: any) => Promise<DateType> | DateType);
  required?: boolean;
  min?: Date;
  max?: Date;
  set?: (self?: Date, item?: Record<string, any>, setterInfo?: any) => Promise<any> | any;
  get?: (self?: Date, item?: Record<string, any>, getterInfo?: any) => Promise<any> | any;
  validate?: CustomValidate;
  description?: any;
}

export type DateAttribute<T, FieldName extends keyof T> = DateProperties & AttributeProperties<T, FieldName>;

interface UpdateDateSetExpression {
  $set: DateType;
  $date?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $ifNotExists?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
}

type DateOperation = { $incr: number; $decr?: CAN_NOT_USE_MULTIPLE_OPERATIONS } | { $decr: number; $incr?: CAN_NOT_USE_MULTIPLE_OPERATIONS };

interface UpdateDateDateExpression {
  $set?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $date: {
    year?: DateOperation;
    month?: DateOperation;
    day?: DateOperation;
    hour?: DateOperation;
    minute?: DateOperation;
  };
  $ifNotExists?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
}
interface UpdateDateIfNotExistsExpression {
  $set?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $date?: CAN_NOT_USE_MULTIPLE_OPERATIONS;
  $ifNotExists: DateType;
}

export type UpdateDateExpression = DateType | UpdateDateSetExpression | UpdateDateDateExpression | UpdateDateIfNotExistsExpression;

export interface DateSimpleInstanceType {
  [Symbol.toPrimitive](hint: "default"): string;
  [Symbol.toPrimitive](hint: "string"): string;
  [Symbol.toPrimitive](hint: "number"): number;
  [Symbol.toPrimitive](hint: string): string | number;
}

type DateType = string | number | DateSimpleInstanceType;
export type DateConditionExpression =
  | {
      $eq?: any;
      $neq?: any;
      $type?: AttributeTypeConditions;
      $between?: [DateType, DateType];
      $in?: [any, ...any[]];
      $not?: DateConditionExpression;
      $exists?: boolean;

      /**
       * @description Greater than
       * @example
       * ```js
       * {
       *  birthday: {
       *    $gt: new Date("1989")
       *  }
       * }
       * ```
       */
      $gt?: DateType;
      $gte?: DateType;
      $lte?: DateType;
      $lt?: DateType;
    }
  | DateType;

/**
 * @description HEllooo
 */

type ValidDateSortKeyExpressions =
  | { $gte?: DateType; $gt?: never; $lte?: never; $lt?: never; $eq?: never; $between?: never; $startsWith?: never }
  | { $gte?: never; $gt?: DateType; $lte?: never; $lt?: never; $eq?: never; $between?: never; $startsWith?: never }
  | { $gte?: never; $gt?: never; $lte?: DateType; $lt?: never; $eq?: never; $between?: never; $startsWith?: never }
  | { $gte?: never; $gt?: never; $lte?: never; $lt?: DateType; $eq?: never; $between?: never; $startsWith?: never }
  | { $gte?: never; $gt?: never; $lte?: never; $lt?: never; $eq?: DateType; $between?: never; $startsWith?: never }
  | { $gte?: never; $gt?: never; $lte?: never; $lt?: never; $eq?: never; $between?: [DateType, DateType]; $startsWith?: never };

export type DateSortKeyExpression = DateType | ValidDateSortKeyExpressions;

const SECONDS_IN_YEAR = 3.154e7;
const M_SECONDS_IN_YEAR = 3.154e10;
const SECONDS_IN_MONTH = 2.628e6;
const M_SECONDS_IN_MONTH = 2.628e9;
const SECONDS_IN_DAY = 86400;
const M_SECONDS_IN_DAY = 8.64e7;
const SECONDS_IN_HOUR = 3600;
const M_SECONDS_IN_HOUR = 3.6e6;
const SECONDS_IN_MINUTE = 60;
const M_SECONDS_IN_MINUTE = 60000;

const EPOCH = {
  year: SECONDS_IN_YEAR,
  month: SECONDS_IN_MONTH,
  day: SECONDS_IN_DAY,
  hour: SECONDS_IN_HOUR,
  minute: SECONDS_IN_MINUTE,
};
const TIMESTAMP = {
  year: M_SECONDS_IN_YEAR,
  month: M_SECONDS_IN_MONTH,
  day: M_SECONDS_IN_DAY,
  hour: M_SECONDS_IN_HOUR,
  minute: M_SECONDS_IN_MINUTE,
};

const FORMAT = { EPOCH, TIMESTAMP };

export const getDateChangedValue = (format: "EPOCH" | "TIMESTAMP", $date: UpdateDateDateExpression["$date"]) => {
  let newDate = 0;

  const v = FORMAT[format];

  if ($date.year) {
    if ($date.year.$incr) {
      newDate += ($date.year.$incr as number) * v.year;
    } else if ($date.year.$decr) {
      newDate -= ($date.year.$decr as number) * v.year;
    }
  }

  if ($date.month) {
    if ($date.month.$incr) {
      newDate += ($date.month.$incr as number) * v.month;
    } else if ($date.month.$decr) {
      newDate -= ($date.month.$decr as number) * v.month;
    }
  }

  if ($date.day) {
    if ($date.day.$incr) {
      newDate += ($date.day.$incr as number) * v.day;
    } else if ($date.day.$decr) {
      newDate -= ($date.day.$decr as number) * v.day;
    }
  }

  if ($date.hour) {
    if ($date.hour.$incr) {
      newDate += ($date.hour.$incr as number) * v.hour;
    } else if ($date.hour.$decr) {
      newDate -= ($date.hour.$decr as number) * v.hour;
    }
  }

  if ($date.minute) {
    if ($date.minute.$incr) {
      newDate += ($date.minute.$incr as number) * v.minute;
    } else if ($date.minute.$decr) {
      newDate -= ($date.minute.$decr as number) * v.minute;
    }
  }

  return Math.floor(newDate);
};

/**
 * @description item can be a Date instance, a valid date ISO string, (js - millisecondes) timestamp or epoch style (secondes)
 */

export const getDateTimestamp = (Schema, item: Date | string | number) => {
  let d = item;

  if (!(d instanceof Date)) {
    if (typeof item == "string") {
      // @ts-ignore
      if (!isNaN(item)) {
        if (item.length == 10 && Schema.format == "EPOCH") {
          d = new Date(Math.floor(Number(item)) * 1000);
        } else if (item.length == 4) {
          d = new Date(item); // considers item to be date year format (ex: "1987")
        } else {
          d = new Date(Number(item)); // as timestamp string ex: "1701444084223"
        }
      } else {
        d = new Date(item); // considers item to be date ISO format
      }
    } else if (typeof item == "number") {
      if (String(Math.floor(item)).length == 10 && Schema.format == "EPOCH") {
        d = new Date(Math.floor(item) * 1000);
      } else {
        d = new Date(item);
      }
    } else {
      d = new Date("invalid"); // to return NaN when date is not valid
    }
  }

  return d.getTime();
};
