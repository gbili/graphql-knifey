import 'dotenv/config';
import { LoadDict } from 'di-why/build/src/DiContainer';
import type { Application } from '../../loaders/app';
import gql from 'graphql-tag';
import { prefixHandle } from '../prefixHandle';

// --- Types ----------------------------------------------------------

export type Resolvers<Context> = Record<string, any>;

export type ApolloServerConfigParams = {
  // Public graph → CORS required
  corsAllowedOrigin: string | RegExp | (string | RegExp)[];
  corsCredentials?: boolean;          // default true for cookies
  cookieSecret?: string;              // for signed cookies (recommended)
  cookieDomain?: string;              // e.g. ".example.com"
  nodeEnv: string;                    // 'production' | 'development' | etc.
  graphqlPlayground: boolean;         // enable playground in dev only
  graphqlIntrospection: boolean;      // enable introspection in dev only
  serverPort: number;
  graphqlPath: string;                // e.g. '/graphql'
  applicationName: string;
  // Cookie names (override if you like)
  accessCookieName?: string;          // default 'sid'
  refreshCookieName?: string;         // default 'rid'
  // Optional: override middleware loading order
  apolloMiddlewaresList?: string[];
};

export type LocatorHandles = { 
  appConfig: string; 
  apolloContext: string; 
  logger: string; 
};

// --- Loader ---------------------------------------------------------

/**
 * Modern modular Apollo server loader that leverages individual middleware loaders
 * This replaces the monolithic apolloStandaloneServer approach
 */
function loadDictElementGen(
  resolvers: Resolvers<any>,
  typeDefs: ReturnType<typeof gql>,
  loaderHandles: LocatorHandles = {
    appConfig: 'appConfig',
    apolloContext: 'apolloContext',
    logger: 'logger',
  }
): LoadDict {
  // Return a LoadDict with loaders for typeDefs, resolvers, and the main orchestrator
  return {
    // Inject the typeDefs and resolvers as a new loader
    _apollo_typeDefs: { instance: typeDefs },
    _apollo_resolvers: { instance: resolvers },
    [prefixHandle('loaderHandles')]: {
      instance: loaderHandles,
    },
    // The main orchestrator that loads everything
    apolloStandaloneServerModular: {
      factory({ apolloMiddlewareLoader }: { apolloMiddlewareLoader: Application }) {
        // Return the fully configured app
        return apolloMiddlewareLoader;
      },
      locateDeps: {
        apolloMiddlewareLoader: 'apolloMiddlewareLoader'
      }
    }
  };
}

export default loadDictElementGen;