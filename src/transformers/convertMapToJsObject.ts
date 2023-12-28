export const convertMapToJsObject = (putItem) => {
  let newValue: any | undefined = putItem;

  if (newValue && newValue instanceof Map) {
    const mapToJsObject = {};
    // Object.fromEntries is not supported by old browsers
    // we also take additionnal properties if newValue is inherited from Map and has own custom properties
    const keys = [...Object.keys(newValue), ...Array.from(newValue.keys())];
    for (const key of keys) {
      mapToJsObject[key] = newValue.get(key);
    }

    newValue = mapToJsObject;
  }

  return newValue;
};
