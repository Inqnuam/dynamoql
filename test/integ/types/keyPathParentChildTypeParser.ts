import type { GetKeyParent, GetKeyChilds } from "../../../dist/types/utils";

const field1: GetKeyChilds<"[0].kilo.hellop"> = "kilo.hellop";
const field2: GetKeyChilds<"[0][0].kilo.hellop"> = "[0].kilo.hellop";
const field3: GetKeyChilds<"kilo.hellop"> = "hellop";
const field4: GetKeyChilds<"kilo[0].hello"> = "[0].hello";
const field5: GetKeyChilds<"kilo.hellop.tapor"> = "hellop.tapor";
const field6: GetKeyChilds<"kilo.hellop.tapor[0]"> = "hellop.tapor[0]";
const field7: GetKeyChilds<"kilo[0].ktor[0].hello"> = "[0].ktor[0].hello";

const field8: GetKeyParent<"[0].kilo.hellop"> = "[0]";
const field9: GetKeyParent<"[0][0].kilo.hellop"> = "[0]";
const field10: GetKeyParent<"kilo.hellop"> = "kilo";
const field11: GetKeyParent<"kilo[0].hello"> = "kilo";
const field12: GetKeyParent<"kilo.hellop.tapor"> = "kilo";
const field13: GetKeyParent<"kilo.hellop.tapor[0]"> = "kilo";
const field14: GetKeyParent<"kilo[0].ktor[0].hello"> = "kilo";
const field15: GetKeyParent<"kilo[0].valod[0].kilo.hellop"> = "kilo";
