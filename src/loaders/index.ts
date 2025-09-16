import env from "./env";
import events from "./events";
import { tokenAuthServiceLDEs } from "./tokenAuthService";
import DiContainer from "di-why";
import { loggerGen } from "swiss-army-knifey";
import appConfigMap from "../config/appConfig";
import appConfigLDEGen from "../utils/loadDictGenerator/appConfig";
import { LoadDict } from "di-why/build/src/DiContainer";
import { mysqlReqLoader as mysqlReq, mysqlMultipleReqLoader as mysqlMultipleReq } from "mysql-oh-wait-utils";
import apolloPullTogetherAndListen from "./apolloPullTogetherAndListen";
import * as apolloPlugins from "./apolloPlugins";
import * as apolloMiddlewares from "./apolloMiddlewares";
import loaderHandles from "./loaderHandles";
import { prefixHandle } from "../utils/prefixHandle";
import app from "./app";
import httpServer from "./httpServer";

const logger = loggerGen({ LOGGER_DEBUG: false, LOGGER_LOG: true, });

// Minimal injection dict with common dependencies for both standalone and subgraph servers
// Users will add apolloStandaloneServerModularLDGen or apolloSubgraphServerModularLDGen on top
export const injectionDict: LoadDict = {
  appConfig: appConfigLDEGen(appConfigMap),
  env,
  events,
  logger: { instance: logger },
  mysqlReq,
  mysqlMultipleReq,
  ...tokenAuthServiceLDEs,
  // Common Apollo infrastructure
  [prefixHandle('loaderHandles')]: loaderHandles,
  app,
  httpServer,
  ...apolloPlugins,
  ...apolloMiddlewares,
  apolloPullTogetherAndListen,
};

// Minimal DI container with common dependencies
// No @apollo/subgraph dependency here!
const di = new DiContainer({
  logger,
  load: injectionDict,
});

export default di;