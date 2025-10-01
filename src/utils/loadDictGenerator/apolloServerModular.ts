import 'dotenv/config';
import { LoadDict } from 'di-why/build/src/DiContainer';
import gql from 'graphql-tag';
import { TypeWithoutUndefined, GraphQLResolverMap } from '../../generalTypes';
import { loadDict } from '../../loaders';
import { createGraphqlMiddlewareConfig } from '../../middleware';
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

const DEFAULT_MIDDLEWARE_CONFIG: MiddlewarePathConfig = createGraphqlMiddlewareConfig();

// --- Loader ---------------------------------------------------------

/**
 * Modern modular Apollo subgraph server loader that leverages individual middleware loaders
 * This replaces the monolithic apolloSubgraphServer approach while maintaining
 * subgraph-specific requirements (disabled landing page, no CSRF, etc.)
 */
// Named parameters for better API - conditional based on server type
export type LoadDictGenParams<T extends 'subgraph' | 'standalone' | 'gateway'> =
  T extends 'gateway'
    ? {
        middlewareConfig?: MiddlewarePathConfig;
      }
    : {
        resolvers: Resolvers<any>;
        typeDefs: ReturnType<typeof gql>;
        middlewareConfig?: MiddlewarePathConfig;
      };

/**
 * To load it call di.load('expressLauncher')
 * @param serverType - 'subgraph' | 'standalone' | 'gateway'
 * @returns
 */
const loadDictGenGen = <T extends 'subgraph' | 'standalone' | 'gateway'>(serverType: T) =>
  (params: LoadDictGenParams<T>): LoadDict => {
    const { middlewareConfig = DEFAULT_MIDDLEWARE_CONFIG } = params;

    // For gateway, don't need typeDefs/resolvers
    if (serverType === 'gateway') {
      return {
        ...loadDict,
        serverType: { instance: serverType },
        middlewareConfig: { instance: middlewareConfig },
      };
    }

    // For subgraph/standalone, need typeDefs/resolvers
    const { resolvers, typeDefs } = params as LoadDictGenParams<'subgraph' | 'standalone'>;
    return {
      ...loadDict,
      typeDefs: { instance: typeDefs },
      resolvers: { instance: resolvers },
      serverType: { instance: serverType },
      middlewareConfig: { instance: middlewareConfig },
    };
  };

export default loadDictGenGen;
