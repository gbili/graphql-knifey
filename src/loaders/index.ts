import env from "./env";
import events from "./events";
import { logger } from "saylo";
import appConfigMapMergerLDE from './appConfigMapMerger';
import { LoadDict } from "di-why/build/src/DiContainer";
import expressLauncher from "./expressLauncher";
import apolloPluginsDict from "./apolloPlugins";
import * as expressMiddlewares from "./expressMiddlewares";
import loaderHandles from "./loaderHandles";
import { prefixHandle } from "../utils/prefixHandle";
import app from "./app";
import httpServer from "./httpServer";
import list from './apolloPlugins/list';
import apolloSubgraphServer from "./apolloSubgraphServer";
import apolloStandaloneServer from "./apolloStandaloneServer";
import appConfig from "./appConfig";

export const loadDict: LoadDict = {
  [prefixHandle('appConfigMap')]: appConfigMapMergerLDE,
  appConfig, // this will contain our appConfig and the user's appConfig merged thanks to appConfigMapMergerLDE
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
  ...expressMiddlewares, //available express middlewares loaders
  // if you call this
  [prefixHandle('expressLauncher')]: expressLauncher,
};