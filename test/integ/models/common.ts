export const clientConfig = {
  region: "eu-west-3",
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "fakeid",
    secretAccessKey: "fakesecret",
  },
};

export class Person {
  firstname: string;
  lastname: string;
  get fullname() {
    return `${this.firstname} ${this.lastname}`;
  }
  save() {
    return true;
  }
  constructor(firstname, lastname) {
    this.firstname = firstname;
    this.lastname = lastname;
  }
}
