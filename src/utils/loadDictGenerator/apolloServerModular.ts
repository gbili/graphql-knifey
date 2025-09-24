import 'dotenv/config';
import { LoadDict } from 'di-why/build/src/DiContainer';
import gql from 'graphql-tag';
import { TypeWithoutUndefined, GraphQLResolverMap } from '../../generalTypes';
import { loadDict, graphqlMiddlewareKey } from '../../loaders';
import { MiddlewarePathConfig } from 'express-knifey';

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

// --- Middleware Configuration --------------------------------------

const DEFAULT_MIDDLEWARE_CONFIG: MiddlewarePathConfig = {
  '/graphql': [
    { name: 'expressTrustProxyMiddleware', priority: 100 },  // Must be first for correct IPs
    { name: 'expressCorsMiddleware', priority: 90 },
    { name: 'expressCookieParserMiddleware', priority: 80 },
    { name: 'expressBodyParserMiddleware', priority: 70 },
    { name: graphqlMiddlewareKey, required: true, priority: -100 }, // Must be last
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
// Named parameters for better API
export type LoadDictGenParams = {
  resolvers: Resolvers<any>;
  typeDefs: ReturnType<typeof gql>;
  middlewareConfig?: MiddlewarePathConfig;
};

/**
 * To load it call di.load('expressLauncher')
 * @param isSubgraph
 * @returns
 */
const loadDictGenGen = (isSubgraph: boolean) => (params: LoadDictGenParams): LoadDict => {
  const {
    resolvers,
    typeDefs,
    middlewareConfig = DEFAULT_MIDDLEWARE_CONFIG
  } = params;
  // Return a LoadDict with loaders for typeDefs, resolvers, and the main orchestrator
  return {
    ...loadDict,
    // Inject the typeDefs and resolvers as a new loader
    typeDefs: { instance: typeDefs },
    resolvers: { instance: resolvers },
    isSubgraph: { instance: isSubgraph },
    middlewareConfig: { instance: middlewareConfig },
  };
}

export default loadDictGenGen;