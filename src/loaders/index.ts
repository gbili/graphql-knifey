import 'dotenv/config';
import { addMergeableConfigMap, envLoader } from 'di-why/build/src/index';
import events from "./events";
import { logger } from "saylo";
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
import gkAppConfigMap from "../config/appConfigMap";
import { appConfigLoader } from 'di-why/build/src/index';
import { gkAppConfigMapNamespace } from "../utils/gkAppConfigMapListAdd";

export const loadDict: LoadDict = {
  appConfig: appConfigLoader,
  env: envLoader,
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
  // graphql-knifey's own appConfigMap
  ...addMergeableConfigMap(gkAppConfigMap, gkAppConfigMapNamespace),
};