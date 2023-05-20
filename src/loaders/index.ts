import envLDE from "./env";
import eventsLDE from "./events";
import loggerLDE from "./logger";
import { tokenAuthServiceLDEs } from "./tokenAuthService";
import { mysqlReqLDEs } from "./mysqlReq";
import DiContainer from "di-why";
import { loggerGen } from "swiss-army-knifey";
import appLDE from './app';
import appConfigMap from "../config/appConfig";
import appConfigLDEGen from "../utils/loadDictGenerator/appConfig";
import { LoadDict } from "di-why/build/src/DiContainer";

export const injectionDict: LoadDict = {
  appConfig: appConfigLDEGen(appConfigMap),
  app: appLDE,
  env: envLDE,
  events: eventsLDE,
  logger: loggerLDE,
  ...mysqlReqLDEs,
  ...tokenAuthServiceLDEs,
};

// TODO remove logger param. Make the DiContainer use the logger passed
// in injection dict or create a default one from within
const di = new DiContainer({
  logger: loggerGen({ LOGGER_DEBUG: false, LOGGER_LOG: true, }),
  load: injectionDict,
});

export default di;