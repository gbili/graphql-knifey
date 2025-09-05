import env from "./env";
import events from "./events";
import { tokenAuthServiceLDEs } from "./tokenAuthService";
import DiContainer from "di-why";
import { loggerGen } from "swiss-army-knifey";
import appConfigMap from "../config/appConfig";
import appConfigLDEGen from "../utils/loadDictGenerator/appConfig";
import { LoadDict } from "di-why/build/src/DiContainer";
import { mysqlReqLoader as mysqlReq, mysqlMultipleReqLoader as mysqlMultipleReq } from "mysql-oh-wait-utils";

// New modular Apollo loaders
import apolloServer from "./apolloServer";
import apolloPullTogetherAndListen from "./apolloPullTogetherAndListen";
import * as apolloPlugins from "./apolloPlugins";
import * as apolloMiddlewares from "./apolloMiddlewares";
import loaderHandles from "./loaderHandles";
import { prefixHandle } from "../utils/prefixHandle";
import app from "./app";
import httpServer from "./httpServer";

const logger = loggerGen({ LOGGER_DEBUG: false, LOGGER_LOG: true, });

export const injectionDict: LoadDict = {
  appConfig: appConfigLDEGen(appConfigMap),
  env,
  events,
  logger: { instance: logger },
  mysqlReq,
  mysqlMultipleReq,
  ...tokenAuthServiceLDEs,
  // New modular Apollo loaders
  [prefixHandle('loaderHandles')]: loaderHandles,
  app,
  httpServer,
  apolloServer,
  ...apolloPlugins,
  ...apolloMiddlewares,
  apolloPullTogetherAndListen,
};

// TODO remove logger param. Make the DiContainer use the logger passed
// in injection dict or create a default one from within
const di = new DiContainer({
  logger,
  load: injectionDict,
});

export default di;