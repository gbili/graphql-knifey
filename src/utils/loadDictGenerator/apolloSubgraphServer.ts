import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { GraphQLResolverMap } from '@apollo/subgraph/dist/schema-helper/resolverMap';
import { TypeWithoutUndefined } from '../../generalTypes';
import gql from 'graphql-tag';
import express from 'express';
import { Application } from '../../loaders/app';
import { HttpServer } from '../../loaders/httpServer';
import { GetInstanceType, LoadDictElement } from 'di-why/build/src/DiContainer';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { Logger } from 'saylo';

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

function loadDictElementGen(
  resolvers: Resolvers<any>,
  typeDefs: ReturnType<typeof gql>,
  {
    appConfig: appConfigHandle,
    apolloContext: apolloContextHandle,
    logger: loggerHandle,
  }: LocatorHandles = {
    appConfig: 'appConfig',
    apolloContext: 'apolloContext',
    logger: 'logger',
  }
) {
  const loadDictElement: LoadDictElement<GetInstanceType<typeof ApolloServer>> = {
    before: async function ({ deps, serviceLocator }) {
      const { nodeEnv, graphqlIntrospection } =
        await serviceLocator.get<ApolloServerConfigParams>(appConfigHandle);
      const { httpDrainApolloPlugin, ...rest } = deps;

      return {
        ...rest,
        plugins: [
          // Subgraph: always disable landing page
          ApolloServerPluginLandingPageDisabled(),
          httpDrainApolloPlugin,
        ],
        // Subgraph: allow introspection only when not in production AND explicitly enabled
        introspection: nodeEnv !== 'production' && Boolean(graphqlIntrospection),
        // Subgraph: CSRF prevention not needed (server-to-server)
        csrfPrevention: false,
      };
    },
    constructible: ApolloServer,
    deps: {
      schema: buildSubgraphSchema({
        typeDefs,
        resolvers,
      }),
    },
    locateDeps: {
      httpDrainApolloPlugin: 'httpDrainApolloPlugin',
    },
    async after({ me: server, serviceLocator }) {
      const contextFunction = await serviceLocator.get(apolloContextHandle);
      const logger = await serviceLocator.get<Logger>(loggerHandle);
      const app = await serviceLocator.get<Application>('app');
      const httpServer = await serviceLocator.get<HttpServer>('httpServer');

      const {
        serverPort,
        graphqlPath,
        applicationName,
        nodeEnv,
        enableDevCors = false,
        corsAllowedOrigin,
      } = await serviceLocator.get<ApolloServerConfigParams>(appConfigHandle);

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

        logger.log(`🚀 Launching "${applicationName}" 🚀`);
        await new Promise<void>((resolve) =>
          httpServer.listen({ port: serverPort }, resolve)
        );
        logger.log(
          `✅ Subgraph running at http://localhost:${serverPort}${graphqlPath}`
        );
      } catch (err) {
        logger.error('Error starting server', err);
      }
    },
  };

  return loadDictElement;
}

export default loadDictElementGen;
