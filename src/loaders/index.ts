import env from "./env";
import events from "./events";
import { tokenAuthServiceLDEs } from "./tokenAuthService";
import DiContainer from "di-why";
import { loggerGen } from "swiss-army-knifey";
import appConfigMap from "../config/appConfig";
import appConfigLDEGen from "../utils/loadDictGenerator/appConfig";
import { LoadDict } from "di-why/build/src/DiContainer";
import { apolloDepsDict } from "../utils/loadDictGenerator/apolloDepsDict";
import { mysqlReqLoader as mysqlReq, mysqlMultipleReqLoader as mysqlMultipleReq } from "mysql-oh-wait-utils";

const logger = loggerGen({ LOGGER_DEBUG: false, LOGGER_LOG: true, });

export const injectionDict: LoadDict = {
  appConfig: appConfigLDEGen(appConfigMap),
  ...apolloDepsDict,
  env,
  events,
  logger: { instance: logger },
  mysqlReq,
  mysqlMultipleReq,
  ...tokenAuthServiceLDEs,
};

// TODO remove logger param. Make the DiContainer use the logger passed
// in injection dict or create a default one from within
const di = new DiContainer({
  logger,
  load: injectionDict,
});

export default di;