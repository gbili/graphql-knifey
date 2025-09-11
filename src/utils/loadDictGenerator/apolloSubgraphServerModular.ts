import 'dotenv/config';
import { LoadDict } from 'di-why/build/src/DiContainer';
import gql from 'graphql-tag';
import { prefixHandle } from '../prefixHandle';
import { CustomizableLoaderHandles, customizableLoaderHandles } from './customizableLoaderHandles';
import { GraphQLResolverMap } from '@apollo/subgraph/dist/schema-helper/resolverMap';
import { TypeWithoutUndefined } from '../../generalTypes';

// --- Types ----------------------------------------------------------

export type Resolvers<Context> = TypeWithoutUndefined<GraphQLResolverMap<Context>>;

export type ApolloSubgraphServerConfigParams = {
  // Subgraph-specific settings
  corsAllowedOrigin?: string;          // optional: only for local tooling in dev
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

export type LocatorHandles = CustomizableLoaderHandles;

// --- Loader ---------------------------------------------------------

/**
 * Modern modular Apollo subgraph server loader that leverages individual middleware loaders
 * This replaces the monolithic apolloSubgraphServer approach while maintaining
 * subgraph-specific requirements (disabled landing page, no CSRF, etc.)
 */
function loadDictGen(
  resolvers: Resolvers<any>,
  typeDefs: ReturnType<typeof gql>,
  loaderHandles: LocatorHandles = customizableLoaderHandles
): LoadDict {
  // Return a LoadDict with loaders for typeDefs, resolvers, and the main orchestrator
  return {
    // Inject the typeDefs and resolvers as a new loader
    [prefixHandle('typeDefs')]: { instance: typeDefs },
    [prefixHandle('resolvers')]: { instance: resolvers },
    [prefixHandle('loaderHandles')]: { instance: loaderHandles },
    // Mark this as a subgraph server
    [prefixHandle('isSubgraph')]: { instance: true },
    // The main orchestrator that loads everything
    apolloSubgraphServerModular: {
      instance: 'load everything',
      locateDeps: {
        apolloPullTogetherAndListen: 'apolloPullTogetherAndListen'
      }
    }
  };
}

export default loadDictGen;