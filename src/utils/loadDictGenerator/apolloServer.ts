import { buildSubgraphSchema } from '@apollo/subgraph';
import { expressMiddleware } from '@apollo/server/express4';
import { LoadDictElement, GetInstanceType } from 'di-why/build/src/DiContainer';
import { ApolloServer } from '@apollo/server';
import Logger from 'saylo/build/src/Logger';
import { ApolloServerPluginLandingPageGraphQLPlayground } from '@apollo/server-plugin-landing-page-graphql-playground';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { GraphQLResolverMap } from '@apollo/subgraph/dist/schema-helper/resolverMap';
import { TypeWithoutUndefined } from '../../generalTypes';
import gql from 'graphql-tag';
import { Application } from '../../loaders/app';
import cors from 'cors';
import express from 'express';
import { HttpServer } from '../../loaders/httpServer';

export type Resolvers<Context> = TypeWithoutUndefined<GraphQLResolverMap<Context>>;

// Make sure to have this config in your own project
export type ApolloServerConfigParams = {
  corsAllowedOrigin: string;
  nodeEnv: string;
  graphqlPlayground: boolean;
  graphqlIntrospection: boolean;
  serverPort: number;
  graphqlPath: string;
  applicationName: string;
}

export type LocatorHandles = { appConfig: string; apolloContext: string; logger: string; }

/**
 * AppConfig is required type param to make sure you have the proper appConfig setup
 * IMPORTANT: make sure AppConfig is the type of the returned di.get('appConfig')
 *
 * @param resolvers graphql resolvers (import resolvers from '../graphql/resolvers')
 * @param typeDefs result of gql`my type definitions` (import graphqlSchema from '../graphql/schema')
 * @returns LoadDictElement<GetInstanceType<typeof ApolloServer>>
 */
function loadDictElementGen(
  resolvers: Resolvers<any>,
  typeDefs: ReturnType<typeof gql>,
  {
    appConfig: appConfigHandle,
    apolloContext: apolloContextHandle,
    logger: loggerHandle
  }: LocatorHandles = {
    appConfig: 'appConfig',
    apolloContext: 'apolloContext',
    logger: 'logger',
  }
) {

  const loadDictElement: LoadDictElement<GetInstanceType<typeof ApolloServer>> = {
    before: async function ({ deps, serviceLocator }) {
      const { nodeEnv, graphqlPlayground, graphqlIntrospection } = await serviceLocator.get<ApolloServerConfigParams>(appConfigHandle);
      const { httpDrainApolloPlugin, ...rest } = deps;
      return {
        ...rest,
        plugins: [
          nodeEnv !== 'production' && graphqlPlayground
            ? ApolloServerPluginLandingPageGraphQLPlayground()
            : ApolloServerPluginLandingPageDisabled(),
          httpDrainApolloPlugin,
        ],
        introspection: nodeEnv !== 'production' && graphqlIntrospection,
        playground: nodeEnv !== 'production' && graphqlPlayground,
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
      const contextFunction = await serviceLocator.get(apolloContextHandle)
      const logger = await serviceLocator.get<InstanceType<typeof Logger>>(loggerHandle);
      const app = await serviceLocator.get<Application>('app');
      const httpServer = await serviceLocator.get<HttpServer>('httpServer');
      const { serverPort, graphqlPath, applicationName } = await serviceLocator.get<ApolloServerConfigParams>(appConfigHandle);
      const { corsAllowedOrigin } = await serviceLocator.get<ApolloServerConfigParams>(appConfigHandle);
      try {
        logger.log(`🚀 Starting Apollo 🚀`);
        await server.start();
        logger.log(`🚀 Started Apollo 🚀`);

        app.use(graphqlPath,
          cors<cors.CorsRequest>({
            origin: corsAllowedOrigin,
          }),
          // 50mb is the limit that `startStandaloneServer` uses, but you may configure this to suit your needs
          express.json({ limit: '50mb' }),
          // expressMiddleware accepts the same arguments:
          // an Apollo Server instance and optional configuration options
          expressMiddleware(server, {
            context: contextFunction,
          }),
        );
        logger.log(`🚀 Launching "${applicationName}" 🚀`);
        await new Promise<void>(resolve => httpServer.listen({ port: serverPort }, resolve));
        logger.log(`🚀 Apollo Server at http://localhost:${serverPort}/${graphqlPath}`);
      } catch (err) {
        logger.error(err);
      }
    },
  };

  return loadDictElement;
}

export default loadDictElementGen;
