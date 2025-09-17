import env from "./env";
import events from "./events";
import { logger } from "saylo";
import appConfigMap from "../config/appConfig";
import appConfigLDEGen from "../utils/loadDictGenerator/appConfig";
import { LoadDict } from "di-why/build/src/DiContainer";
import apolloPullTogetherAndListen from "./apolloPullTogetherAndListen";
import apolloPluginsDict from "./apolloPlugins";
import * as apolloMiddlewares from "./apolloMiddlewares";
import loaderHandles from "./loaderHandles";
import { prefixHandle } from "../utils/prefixHandle";
import app from "./app";
import httpServer from "./httpServer";
import list from './apolloPlugins/list';
import apolloSubgraphServer from "./apolloSubgraphServer";
import apolloStandaloneServer from "./apolloStandaloneServer";

export const loadDict: LoadDict = {
  appConfig: appConfigLDEGen(appConfigMap),
  env,
  events,
  logger: { instance: logger },
  [prefixHandle('loaderHandles')]: loaderHandles,
  app, // express
  httpServer,
  // ApolloServer Both flavors in the loaders
  apolloSubgraphServer,
  apolloStandaloneServer,
  ...apolloPluginsDict, // available plugins
  apolloPlugins: list, // loader for selection of plugins used by ApolloServer
  ...apolloMiddlewares, //available middlewares loaders
  // if you call this
  [prefixHandle('apolloPullTogetherAndListen')]: apolloPullTogetherAndListen,
};