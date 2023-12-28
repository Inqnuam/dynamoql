import { isBinary } from "../types/attributes/binary";
import { getDateTimestamp } from "../types/attributes/date";
import { isNumber } from "../types/attributes/number";

export const nativeTypeToDDBType = (field: any): string | undefined => {
  const typeOfField = typeof field;

  switch (typeOfField) {
    case "object":
      if (Array.isArray(field)) {
        return "L";
      } else if (field instanceof Set) {
        const values = Array.from(field.values());
        if (values.every(isNumber)) {
          return "NS";
        } else if (values.every((x) => typeof x == "string")) {
          return "SS";
        } else if (values.every(isBinary)) {
          return "BS";
        } else if (values.every((x) => !isNaN(getDateTimestamp({ type: "D" }, x)))) {
          return "NS";
        }
        return "Multi-type Set instance";
      } else if (isBinary(field)) {
        return "B";
      } else if (field === null) {
        return "NULL";
      } else if (field instanceof Date) {
        return "N";
      } else {
        return "M";
      }

    case "string":
      return "S";
    case "bigint":
      return "N";
    case "number":
      if (isNaN(field)) {
        return "NaN";
      }
      return "N";
    case "boolean":
      return "BOOL";

    default:
      return undefined;
  }
};
