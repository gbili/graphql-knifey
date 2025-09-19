import 'dotenv/config';
import { LoadDict } from 'di-why/build/src/DiContainer';
import gql from 'graphql-tag';
import { prefixHandle, prefixValue } from '../prefixHandle';
import { CustomizableLoaderHandles, customizableLoaderHandles } from './customizableLoaderHandles';
import { TypeWithoutUndefined, GraphQLResolverMap } from '../../generalTypes';
import { loadDict } from '../../loaders';
import { MiddlewarePathConfig } from '../../types/middleware';

// --- Types ----------------------------------------------------------

export type Resolvers<Context> = TypeWithoutUndefined<GraphQLResolverMap<Context>>;

export type ApolloServerConfigParams = {
  // Subgraph-specific settings
  corsAllowedOrigin: string | RegExp | (string | RegExp)[];
  enableDevCors?: boolean;             // default false for subgraphs
  nodeEnv: string;                    // 'production' | 'development' | etc.
  graphqlPlayground: boolean;         // kept for compatibility; ignored in subgraph
  graphqlIntrospection: boolean;      // enable introspection in dev only
  serverPort: number;
  graphqlPath: string;                // e.g. '/graphql'
  applicationName: string;
  // Optional: override middleware loading order
  apolloMiddlewaresList?: string[];
};

export type ApolloSubgraphServerConfigParam = ApolloServerConfigParams;

export type ApolloStandaloneServerConfigParams = ApolloServerConfigParams & {
  // Public graph → CORS required
  corsCredentials?: boolean;          // default true for cookies
  cookieSecret?: string;              // for signed cookies (recommended)
  cookieDomain?: string;              // e.g. ".example.com"
  // Cookie names (override if you like)
  accessCookieName?: string;          // default 'sid'
  refreshCookieName?: string;         // default 'rid'
};

export type LocatorHandles = CustomizableLoaderHandles;

// --- Middleware Configuration --------------------------------------

const DEFAULT_MIDDLEWARE_CONFIG: MiddlewarePathConfig = {
  '/graphql': [
    { name: 'expressTrustProxyMiddleware', priority: 100 },  // Must be first for correct IPs
    { name: 'expressCorsMiddleware', priority: 90 },
    { name: 'expressCookieParserMiddleware', priority: 80 },
    { name: 'expressBodyParserMiddleware', priority: 70 },
    { name: 'expressGraphqlMiddleware', required: true, priority: -100 }, // Must be last
  ],
  '/healthz': [
    { name: 'expressHealthCheckMiddleware', priority: 0 },
  ],
};

// --- Loader ---------------------------------------------------------

/**
 * Modern modular Apollo subgraph server loader that leverages individual middleware loaders
 * This replaces the monolithic apolloSubgraphServer approach while maintaining
 * subgraph-specific requirements (disabled landing page, no CSRF, etc.)
 */
const loadDictGenGen = (isSubgraph: boolean) => (
  resolvers: Resolvers<any>,
  typeDefs: ReturnType<typeof gql>,
  loaderHandles: LocatorHandles = customizableLoaderHandles,
  middlewareConfig: MiddlewarePathConfig = DEFAULT_MIDDLEWARE_CONFIG
): LoadDict => {
  // Return a LoadDict with loaders for typeDefs, resolvers, and the main orchestrator
  return {
    ...loadDict,
    // Inject the typeDefs and resolvers as a new loader
    [prefixHandle('typeDefs')]: { instance: typeDefs },
    [prefixHandle('resolvers')]: { instance: resolvers },
    [prefixHandle('loaderHandles')]: { instance: loaderHandles },
    [prefixHandle('isSubgraph')]: { instance: isSubgraph },
    [prefixHandle('middlewareConfig')]: { instance: middlewareConfig },
    // The main orchestrator that loads everything
    apolloServer: {
      instance: 'load everything',
      locateDeps: {
        ...prefixValue('expressLauncher'),
      }
    }
  };
}

export default loadDictGenGen;