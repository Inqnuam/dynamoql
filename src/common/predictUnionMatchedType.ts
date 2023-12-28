import { getDateTimestamp } from "../types/attributes/date";
import { isNotNestable } from "../types/utils";
import { nativeTypeToDDBType } from "./nativeTypeToDDBType";

const getObjectMatchScore = (t, item, itemKeys: string[]) => {
  const foundType = {
    matched: 0,
    allowUndeclared: t.allowUndeclared,
  };

  itemKeys.forEach((k) => {
    if (k in t.fields) {
      foundType.matched += 0.5;
      if (t.fields[k].type == nativeTypeToDDBType(item[k])) {
        if (t.fields[k].type == "M") {
          const matchedChild = getObjectMatchScore(t.fields[k], item[k], Object.keys(item[k]));

          foundType.matched += matchedChild.matched;
        } else if (t.fields[k].type == "L") {
          const foundMatch = findBestArrayMatch([t.fields[k]], item[k]);
          if (foundMatch) {
            foundType.matched += foundMatch.score;
          }
        } else {
          foundType.matched++;
        }
      } else if (Array.isArray(t.fields[k].type)) {
        const foundNestedType = predictTypeFromUnion(t.fields[k].type, item[k]);

        if (foundNestedType) {
          if (isNotNestable(foundNestedType.type)) {
            foundType.matched++;
          } else if (foundNestedType.type == "M") {
            const matchedChild = getObjectMatchScore(foundNestedType, item[k], Object.keys(item[k]));

            foundType.matched += matchedChild.matched;
          } else if (foundNestedType.type == "L") {
            const foundMatch = findBestArrayMatch([foundNestedType], item[k]);
            if (foundMatch) {
              foundType.matched += foundMatch.score;
            }
          }
        }
      } else if (t.fields[k].type == "D" && getDateTimestamp(t.fields[k], item[k])) {
        foundType.matched++;
      }
    }
  });

  const k = Object.keys(t.fields);
  const m = itemKeys.filter((f) => !k.includes(f));

  if (!itemKeys.length && !Object.keys(t.fields).length) {
    foundType.matched++;
    return foundType;
  }

  if (foundType.matched && foundType.matched >= k.length) {
    if (t.allowUndeclared && foundType.matched > k.length) {
      foundType.matched = foundType.matched + m.length;
    }
    return foundType;
  }

  if (t.allowUndeclared) {
    return { matched: foundType.matched + m.length, allowUndeclared: true };
  }

  return foundType;
};

const findBestObjectMatch = (types: any[], item: any) => {
  const itemKeys = Object.keys(item);

  const matchedTypesPredicts = [];
  for (let i = 0; i < types.length; i++) {
    const t = types[i];
    matchedTypesPredicts.push(getObjectMatchScore(t, item, itemKeys));
  }

  const bests = matchedTypesPredicts.slice().sort((a, z) => {
    if (a.matched == z.matched) {
      if (!a.allowUndeclared && z.allowUndeclared) {
        return -1;
      }
      if (!z.allowUndeclared && a.allowUndeclared) {
        return 1;
      }

      if (!a.allowUndeclared && !z.allowUndeclared) {
        return 1;
      }
      return 0;
    }

    return z.matched - a.matched;
  });

  const [best] = bests;
  return types[matchedTypesPredicts.findIndex((x) => x == best)];
};

const findBestArrayMatch = (types: any[], items: any[]) => {
  const matchedArraysItemScore = types.map((x) => {
    return {
      type: x.items.type,
      allowUndeclared: x.items.allowUndeclared,
      format: x.items.format,
      score: 0,
    };
  });

  const dateTypeIndex = matchedArraysItemScore.findIndex((x) => x.type == "D");

  for (let i = 0; i < items.length; i++) {
    const element = items[i];

    const marshalledType = nativeTypeToDDBType(element);

    let foundIndex = -1;

    if (dateTypeIndex != -1 && getDateTimestamp(matchedArraysItemScore[dateTypeIndex], element)) {
      foundIndex = dateTypeIndex;
    } else {
      foundIndex = matchedArraysItemScore.findIndex((x) => {
        // if union
        if (Array.isArray(x.type)) {
          return x.type.find((u) => u.type == marshalledType);
        }

        return x.type == marshalledType;
      });
    }

    if (foundIndex == -1) {
      continue;
    }

    if (isNotNestable(marshalledType)) {
      matchedArraysItemScore[foundIndex].score++;

      if (matchedArraysItemScore[foundIndex].type == "D") {
        //  && getDateTimestamp(matchedArraysItemScore[foundIndex], element)
      }
    } else {
      for (let ai = 0; ai < types.length; ai++) {
        const schema = types[ai];
        if (schema.items.type == marshalledType) {
          if (marshalledType == "M") {
            matchedArraysItemScore[ai].score += getObjectMatchScore(schema.items, element, Object.keys(element)).matched;
          } else if (marshalledType == "L") {
            const foundMatch = findBestArrayMatch([schema.items], element);
            if (foundMatch) {
              matchedArraysItemScore[ai].score += foundMatch.score;
            }
          }
        } else if (Array.isArray(schema.items.type)) {
          const foundNestedType = predictTypeFromUnion(schema.items.type, element);

          if (foundNestedType) {
            if (foundNestedType.type == "M") {
              matchedArraysItemScore[ai].score += getObjectMatchScore(foundNestedType, element, Object.keys(element)).matched;
            } else if (marshalledType == "L") {
              const foundMatch = findBestArrayMatch([foundNestedType], element);
              if (foundMatch) {
                matchedArraysItemScore[ai].score += foundMatch.score;
              }
            }
          }
        }
      }
    }
  }

  const bests = matchedArraysItemScore.slice().sort((a, z) => {
    if (a.score == z.score) {
      if (!a.allowUndeclared && z.allowUndeclared) {
        return -1;
      }
      if (!z.allowUndeclared && a.allowUndeclared) {
        return 1;
      }

      if (!a.allowUndeclared && !z.allowUndeclared) {
        return 1;
      }

      return 0;
    }

    return z.score - a.score;
  });

  const [best] = bests;
  if (best.score) {
    return {
      schema: types[matchedArraysItemScore.findIndex((x) => x == best)],
      score: best.score,
    };
  }
};

export const findMatchedNestableUnionTypes = (Schema, marshalledType: string) => {
  const matchedTypes = [];
  for (let i = 0; i < Schema.type.length; i++) {
    const u = Schema.type[i];

    if (marshalledType == u.type && (u.type == "M" || u.type == "L")) {
      matchedTypes.push(u);
    } else {
      continue;
    }
  }

  return matchedTypes;
};

export const findBestMatch = (types: any[], item: any, marshalledType: string) => {
  if (marshalledType == "M") {
    return findBestObjectMatch(types, item);
  } else if (marshalledType == "L") {
    return findBestArrayMatch(types, item)?.schema;
  }
};

export const predictTypeFromUnion = (Schema: any[], item: any) => {
  const marshalledType = nativeTypeToDDBType(item);

  const foundSchemas = [];

  for (const s of Schema) {
    if (s.type == "D" && getDateTimestamp(s, item)) {
      return s;
    } else if (s.type == marshalledType) {
      if (!isNotNestable(marshalledType) || !foundSchemas.find((x) => x.type == marshalledType)) {
        foundSchemas.push(s);
      }
    }
  }

  if (foundSchemas.length == 1) {
    return foundSchemas[0];
  } else if (foundSchemas.length) {
    return findBestMatch(foundSchemas, item, marshalledType);
  }
};
