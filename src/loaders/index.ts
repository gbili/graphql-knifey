import 'dotenv/config';
import { addMergeableConfigMap, LoadDict } from 'di-why';
import { expressLoadDict } from 'express-knifey';
import apolloPluginsDict from "./apolloPlugins";
import list from './apolloPlugins/list';
import apolloSubgraphServer from "./apolloSubgraphServer";
import apolloStandaloneServer from "./apolloStandaloneServer";
import gkAppConfigMap from "../config/appConfigMap";
import { gkAppConfigMapNamespace } from "../utils/gkAppConfigMapListAdd";
import graphqlMiddleware from './expressMiddlewares/graphqlMiddleware';

export const loadDict: LoadDict = {
  // Start with the complete Express server foundation from express-knifey
  ...expressLoadDict,

  // ApolloServer Both flavors in the loaders
  apolloSubgraphServer,
  apolloStandaloneServer,

  // Apollo plugins
  ...apolloPluginsDict, // available plugins
  apolloPlugins: list, // loader for selection of plugins used by ApolloServer
  // GraphQL middleware (only the GraphQL-specific one stays here)
  graphqlMiddleware,

  // graphql-knifey's own appConfigMap (merges with express-knifey's)
  ...addMergeableConfigMap(gkAppConfigMap, gkAppConfigMapNamespace),
};