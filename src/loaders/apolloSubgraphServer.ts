import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { TypeWithoutUndefined, GraphQLResolverMap } from '../generalTypes';
import express, { Application } from 'express';
import { GetInstanceType, LoadDictElement } from 'di-why/build/src/DiContainer';
import { Logger } from 'saylo';

// Import buildSubgraphSchema lazily - will throw if @apollo/subgraph is not installed
// This is intentional - users of apolloSubgraphServer must have @apollo/subgraph installed
let buildSubgraphSchema: any;
try {
  buildSubgraphSchema = require('@apollo/subgraph').buildSubgraphSchema;
} catch (e) {
  // Will only fail when this module is actually used
  buildSubgraphSchema = () => {
    throw new Error('@apollo/subgraph must be installed to use apolloSubgraphServerLDEGen. Run: npm install @apollo/subgraph');
  };
}

export type Resolvers<Context> = TypeWithoutUndefined<GraphQLResolverMap<Context>>;

export type ApolloServerConfigParams = {
  // keep but default to NOT using it for subgraphs
  corsAllowedOrigin?: string;          // optional: only for local tooling in dev
  enableDevCors?: boolean;             // NEW: default false
  nodeEnv: string;
  graphqlPlayground: boolean;          // kept for compatibility; ignored in subgraph
  graphqlIntrospection: boolean;       // allow introspection in dev only
  serverPort: number;
  graphqlPath: string;
  applicationName: string;
}

export type LocatorHandles = { appConfig: string; apolloContext: string; logger: string; }

const loadDictElement: LoadDictElement<GetInstanceType<typeof ApolloServer>> = {
  before: async function ({ deps, serviceLocator }) {
    const { typeDefs, resolvers, loaderHandles, apolloPlugins, appConfig, ...rest } = deps;
    const { nodeEnv, graphqlIntrospection } = appConfig;

    return {
      ...rest,
      schema: buildSubgraphSchema({
        typeDefs,
        resolvers,
      }),
      plugins: apolloPlugins,
      // Subgraph: allow introspection only when not in production AND explicitly enabled
      introspection: nodeEnv !== 'production' && Boolean(graphqlIntrospection),
      // Subgraph: CSRF prevention not needed (server-to-server)
      csrfPrevention: false,
    };
  },
  constructible: ApolloServer,
  locateDeps: {
    appConfig: 'appConfig',
    typeDefs: 'typeDefs',
    resolvers: 'resolvers',
    apolloPlugins: 'apolloPlugins',
  },
  async after({ me: server, serviceLocator }) {
    const contextFunction = await serviceLocator.get('apolloContext');
    const logger = await serviceLocator.get<Logger>('logger');
    const app = await serviceLocator.get<Application>('app');

    const {
      graphqlPath,
      nodeEnv,
      enableDevCors = false,
      corsAllowedOrigin,
    } = await serviceLocator.get<ApolloServerConfigParams>('appConfig');

    try {
      logger.log(`🚀 Starting Apollo (subgraph) 🚀`);
      await server.start();
      logger.log(`🚀 Started Apollo 🚀`);

      // Subgraph best practice: DO NOT expose CORS.
      // If you truly need it for local tooling, gate it behind enableDevCors and never enable in prod.
      const middlewares: Array<express.RequestHandler> = [
        // 50mb matches startStandaloneServer default; tune if needed
        express.json({ limit: '50mb' }),
        expressMiddleware(server, { context: contextFunction }),
      ];

      if (nodeEnv !== 'production' && enableDevCors && corsAllowedOrigin) {
        // Lazy import to avoid bringing cors into prod bundle by mistake
        const { default: cors } = await import('cors');
        app.use(
          graphqlPath,
          cors({ origin: corsAllowedOrigin, credentials: false }),
          ...middlewares
        );
      } else {
        app.use(graphqlPath, ...middlewares);
      }

      // Simple health endpoint
      app.get('/healthz', (_req, res) => res.status(200).send('ok'));

    } catch (err) {
      logger.error('Error starting server', err);
    }
  },
};

export default loadDictElement;