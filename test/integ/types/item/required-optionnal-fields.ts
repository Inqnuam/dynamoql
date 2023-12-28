import { type Fruit } from "../../models/fruits";

// @ts-expect-error
const someInvalidFruit: Fruit = {};

// @ts-expect-error
const orange: Fruit = {
  id: "123",
};

// @ts-expect-error
const banana: Fruit = {
  name: "banana",
  vitamins: {
    K: 4,
  },
  weight: 3,
};

const apricot: Fruit = {
  name: "apricot",
  data: [],
  id: "6543",
  vitamins: {
    C: 23,
    K: 1,
  },
};

const mango: Fruit = {
  name: "mango",
  weight: 9,
  data: new Set(["tropical"]),
  // @ts-expect-error
  vitamins: {},
};

const grape: Fruit = {
  name: "grape",
  weight: 3,
  data: {
    country: "Somewhere",
  },
  // @ts-expect-error
  vitamins: {
    C: 4,
  },
};

const pineapple: Fruit = {
  name: "pineapple",
  weight: 3,
  data: false,
  vitamins: {
    K: 4,
  },
};

const apple: Fruit = {
  name: "apple",
  weight: 40,
  data: null,
};
