import 'dotenv/config';
import { addMergeableConfigMap, LoadDict } from 'di-why';
import { expressLoadDict } from 'express-knifey';
import apolloPluginsDict from "./apolloPlugins";
import list from './apolloPlugins/list';
import apolloSubgraphServer from "./apolloSubgraphServer";
import apolloStandaloneServer from "./apolloStandaloneServer";
import apolloGatewayServer from "./apolloGatewayServer";
import gkAppConfigMap from "../config/appConfigMap";
import { gkAppConfigMapNamespace } from "../utils/gkAppConfigMapListAdd";
import graphqlMiddleware from './expressMiddlewares/graphqlMiddleware';
import { graphqlMiddlewareHandle } from '../middleware';
import datAuthMinterServiceLDE from './datAuthMinterService';
import datAuthServiceLDE from './datAuthService';

export const loadDict: LoadDict = {
  // Start with the complete Express server foundation from express-knifey
  ...expressLoadDict,

  // ApolloServer all three flavors
  apolloSubgraphServer,
  apolloStandaloneServer,
  apolloGatewayServer,

  // DAT services for gateway -> subgraph: authentication forwarding
  datAuthMintService: datAuthMinterServiceLDE,
  datAuthService: datAuthServiceLDE,

  // Apollo plugins
  ...apolloPluginsDict, // available plugins
  apolloPlugins: list, // loader for selection of plugins used by ApolloServer
  // GraphQL middleware (only the GraphQL-specific one stays here)
  [graphqlMiddlewareHandle]: graphqlMiddleware,

  // graphql-knifey's own appConfigMap (merges with express-knifey's)
  ...addMergeableConfigMap(gkAppConfigMap, gkAppConfigMapNamespace),
};
