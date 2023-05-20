import mysqlMultipleReqLDE from "./mysqlMultipleReq";
import mysqlReqLDE from "./mysqlReq";
import mysqlConnectionConfigLDE from "./mysqlConnectionConfig";
import { LoadDict } from "di-why/build/src/DiContainer";

export const mysqlReqLDEs: LoadDict = {
  mysqlConnectionConfig: mysqlConnectionConfigLDE,
  mysqlMultipleReq: mysqlMultipleReqLDE,
  mysqlReq: mysqlReqLDE,
};

export default mysqlReqLDEs;