import env from "./env";
import events from "./events";
import { tokenAuthServiceLDEs } from "./tokenAuthService";
import { mysqlReqLDEs } from "./mysqlReq";
import DiContainer from "di-why";
import { loggerGen } from "swiss-army-knifey";
import app from './app';
import appConfigMap from "../config/appConfig";
import appConfigLDEGen from "../utils/loadDictGenerator/appConfig";
import { LoadDict } from "di-why/build/src/DiContainer";
import httpServer from "./httpServer";
import httpDrainApolloPlugin from "./httpDrainApolloPlugin";

const logger = loggerGen({ LOGGER_DEBUG: false, LOGGER_LOG: true, });

export const injectionDict: LoadDict = {
  appConfig: appConfigLDEGen(appConfigMap),
  app,
  httpServer,
  httpDrainApolloPlugin,
  env,
  events,
  logger: { instance: logger },
  ...mysqlReqLDEs,
  ...tokenAuthServiceLDEs,
};

// TODO remove logger param. Make the DiContainer use the logger passed
// in injection dict or create a default one from within
const di = new DiContainer({
  logger,
  load: injectionDict,
});

export default di;