import { AttributePath } from "./AttributePath";
import { AttributeValue } from "./AttributeValue";
import { unmarshall, marshall } from "@aws-sdk/util-dynamodb";
import { AttributeValue as AttributeValueModel } from "@aws-sdk/client-dynamodb";
import type { marshallOptions, unmarshallOptions } from "@aws-sdk/util-dynamodb";

/**
 * An object that manages expression attribute name and value substitution.
 */
export class ExpressionAttributes {
  readonly names: Record<string, string> = {};
  readonly values: Record<string, any> = {};
  #modeledValues: any = {};
  private readonly nameMap: { [attributeName: string]: string } = {};
  private _ctr = 0;
  marshallOptions: marshallOptions;
  static #PRIMITIVES = new Set(["S", "N", "BOOL", "NULL"]);
  constructor(marshallOptions: marshallOptions) {
    this.marshallOptions = marshallOptions;
  }
  /**
   * Add an attribute path to this substitution context.
   *
   * @returns The substitution value to use in the expression. The same
   * attribute name will always be converted to the same substitution value
   * when supplied to the same ExpressionAttributes object multiple times.
   */
  addName(path: AttributePath | string): string {
    if (AttributePath.isAttributePath(path)) {
      let escapedPath = "";
      for (const element of path.elements) {
        if (element.type === "AttributeName") {
          escapedPath += `.${this.addAttributeName(element.name)}`;
        } else {
          escapedPath += `[${element.index}]`;
        }
      }

      return escapedPath.substring(1);
    }

    return this.addName(new AttributePath(path));
  }

  /**
   * Add an attribute value to this substitution context.
   *
   * @returns The substitution value to use in the expression.
   */
  addValue(value: any): string {
    const modeledAttrValue = AttributeValue.isAttributeValue(value) ? (value.marshalled as AttributeValueModel) : marshall(value, this.marshallOptions);

    const marshalledValue = Object.entries(modeledAttrValue)[0];

    const [dbType, val] = marshalledValue;
    const isPrimitive = ExpressionAttributes.#PRIMITIVES.has(dbType);
    if (isPrimitive && this.#modeledValues[`${dbType}${val}`]) {
      return this.#modeledValues[`${dbType}${val}`];
    }

    const substitution = `:v${this._ctr++}`;

    this.values[substitution] = modeledAttrValue;

    if (isPrimitive) {
      this.#modeledValues[`${dbType}${val}`] = substitution;
    }

    return substitution;
  }

  private addAttributeName(attributeName: string): string {
    if (!(attributeName in this.nameMap)) {
      this.nameMap[attributeName] = `#n${this._ctr++}`;
      this.names[this.nameMap[attributeName]] = attributeName;
    }

    return this.nameMap[attributeName];
  }
}
