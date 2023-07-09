import { buildSubgraphSchema } from '@apollo/subgraph';
import { LoadDictElement, GetInstanceType } from 'di-why/build/src/DiContainer';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import Logger from 'saylo/build/src/Logger';
import { ApolloServerPluginLandingPageGraphQLPlayground } from '@apollo/server-plugin-landing-page-graphql-playground';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { GraphQLResolverMap } from '@apollo/subgraph/dist/schema-helper/resolverMap';
import { TypeWithoutUndefined } from '../../generalTypes';
import gql from 'graphql-tag';

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
      const { corsAllowedOrigin, nodeEnv, graphqlPlayground, graphqlIntrospection } = await serviceLocator.get<ApolloServerConfigParams>(appConfigHandle);
      return {
        ...deps,
        plugins: [
          nodeEnv !== 'production' && graphqlPlayground
            ? ApolloServerPluginLandingPageGraphQLPlayground()
            : ApolloServerPluginLandingPageDisabled(),
        ],
        introspection: nodeEnv !== 'production' && graphqlIntrospection,
        playground: nodeEnv !== 'production' && graphqlPlayground,
        cors: corsAllowedOrigin,
      };
    },
    constructible: ApolloServer,
    deps: {
      schema: buildSubgraphSchema({
        typeDefs,
        resolvers,
      }),
    },
    async after({ me, serviceLocator }) {
      const contextFunction = await serviceLocator.get(apolloContextHandle)
      const logger = await serviceLocator.get<InstanceType<typeof Logger>>(loggerHandle);
      const { serverPort, graphqlPath, applicationName } = await serviceLocator.get<ApolloServerConfigParams>(appConfigHandle);
      try {
        const { url } = await startStandaloneServer(me, {
          context: contextFunction,
          listen: { port: serverPort, path: graphqlPath },
        });
        logger.log(`🚀 Launching "${applicationName}" 🚀`);
        logger.log(`🚀 Apollo Server at ${url} 🚀`);
      } catch (err) {
        logger.error(err);
      }
    },
  };

  return loadDictElement;
}

export default loadDictElementGen;
