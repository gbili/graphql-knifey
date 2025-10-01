import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import type { GetInstanceType, LoadDictElement } from 'di-why/build/src/DiContainer';
import type { Logger } from 'saylo';

/**
 * Apollo Gateway Server Loader
 *
 * Creates an ApolloServer instance configured for Federation Gateway.
 * Requires 'apolloGateway' dependency instead of typeDefs/resolvers.
 *
 * @apollo/gateway is an optional dependency - only needed when using this loader.
 * If not installed, this loader will throw a helpful error message.
 */
const loadDictElement: LoadDictElement<GetInstanceType<typeof ApolloServer>> = {
  before: async function ({ deps }) {
    const { apolloGateway, apolloPlugins, appConfig, ...rest } = deps;
    const { nodeEnv, graphqlIntrospection } = appConfig;

    const isProd = nodeEnv === 'production';

    return {
      ...rest,
      gateway: apolloGateway,
      plugins: apolloPlugins,
      introspection: !isProd && Boolean(graphqlIntrospection),
      // Gateway: CSRF prevention enabled (public-facing)
      csrfPrevention: true,
    };
  },
  constructible: ApolloServer,
  locateDeps: {
    appConfig: 'appConfig',
    apolloGateway: 'apolloGateway',
    apolloPlugins: 'apolloPlugins',
  },
  async after({ me: server, serviceLocator }) {
    const logger = await serviceLocator.get<Logger>('logger');

    // Just start the server - middleware mounting handled by graphqlMiddleware
    logger.log(`🚀 Starting Apollo Gateway server 🚀`);
    await server.start();
    logger.log(`✅ Apollo Gateway server started`);
  },
};

export default loadDictElement;
