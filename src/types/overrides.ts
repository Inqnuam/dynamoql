import type { PutItemCommandInput } from "@aws-sdk/client-dynamodb";

interface PutItemReturnValues {
  /**
   * @public
   * <p>Use <code>ReturnValues</code> if you want to get the item attributes as they appeared
   *             before they were updated with the <code>PutItem</code> request. For
   *             <code>PutItem</code>, the valid values are:</p>
   *          <ul>
   *             <li>
   *                <p>
   *                   <code>NONE</code> - If <code>ReturnValues</code> is not specified, or if its
   *                     value is <code>NONE</code>, then nothing is returned. (This setting is the
   *                     default for <code>ReturnValues</code>.)</p>
   *             </li>
   *             <li>
   *                <p>
   *                   <code>ALL_OLD</code> - If <code>PutItem</code> overwrote an attribute name-value
   *                     pair, then the content of the old item is returned.</p>
   *             </li>
   *          </ul>
   *          <p>The values returned are strongly consistent.</p>
   *          <p>There is no additional cost associated with requesting a return value aside from the
   *             small network and processing overhead of receiving a larger response. No read capacity
   *             units are consumed.</p>
   */
  ReturnValues?: "NONE" | "ALL_OLD";
  /**
   * @description Return PutItemCommandInput insead of executing.
   */
  exec?: boolean;
  setterInfo?: any;
}

export type PutItemOptions = Omit<
  PutItemCommandInput,
  "TableName" | "Item" | "Expected" | "ReturnValues" | "ConditionalOperator" | "ConditionExpression" | "ExpressionAttributeNames" | "ExpressionAttributeValues"
> &
  PutItemReturnValues;
