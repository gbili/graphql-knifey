import { ApolloServer, gql } from 'apollo-server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { LoadDictElement, GetInstanceType } from 'di-why/build/src/DiContainer';
import Logger from 'saylo/build/src/Logger';
import { ApolloServerPluginLandingPageDisabled, ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import { GraphQLResolverMap } from '@apollo/subgraph/dist/schema-helper/resolverMap';
import { TypeWithoutUndefined } from '../../generalTypes';

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
function loadDictElementGen<AppConfig extends ApolloServerConfigParams>(
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
      const { corsAllowedOrigin, nodeEnv, graphqlPlayground, graphqlIntrospection } = await serviceLocator.get<AppConfig>(appConfigHandle);
      console.log(nodeEnv, graphqlIntrospection, graphqlPlayground);
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
    locateDeps: {
      context: apolloContextHandle,
    },
    async after({ me, serviceLocator }) {
      const logger = await serviceLocator.get<InstanceType<typeof Logger>>(loggerHandle);
      const { serverPort, graphqlPath, applicationName } = await serviceLocator.get<AppConfig>(appConfigHandle);
      try {
        const { url } = await me.listen({ port: serverPort, path: graphqlPath }, () => {
          logger.log(`🚀 ${applicationName.repeat(5)} 🚀`);
          logger.log(`🚀 ${applicationName.repeat(2)} App: http://localhost:${serverPort}${graphqlPath} ${applicationName.repeat(2)} 🚀`);
          logger.log(`🚀 ${applicationName.repeat(5)} 🚀`);
        });
        logger.log(`🚀 Apollo Server will be ready ready at ${url} 🚀`);
      } catch (err) {
        logger.error(err);
      }
    },
  };

  return loadDictElement;
}

export default loadDictElementGen;
