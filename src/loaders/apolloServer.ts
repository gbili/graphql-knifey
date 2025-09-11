import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { LoadDictElement } from 'di-why/build/src/DiContainer';
import type { Logger } from 'saylo';
import { prefixValue, prefixHandle } from '../utils/prefixHandle';
import { CustomizableLoaderHandles } from '../utils/loadDictGenerator/customizableLoaderHandles';

const loadDictElement: LoadDictElement<ApolloServer<any>> = {
  async before({
    deps: {
      loaderHandles,
      typeDefs,
      resolvers,
      isSubgraph,
      landingPagePlugin,
      httpDrainPlugin,
      ...rest
    },
    serviceLocator
  }) {
    const appConfig = await serviceLocator.get<any>((loaderHandles as CustomizableLoaderHandles).appConfig);
    const { nodeEnv, graphqlIntrospection } = appConfig;
    
    // Check if this is a subgraph server
    if (isSubgraph) {
      // Build subgraph schema
      const schema = buildSubgraphSchema({
        typeDefs,
        resolvers,
      });
      
      return {
        ...rest,
        schema,
        plugins: [
          // Subgraph: always disable landing page
          ApolloServerPluginLandingPageDisabled(),
          httpDrainPlugin,
        ],
        // Subgraph: allow introspection only when not in production AND explicitly enabled
        introspection: nodeEnv !== 'production' && Boolean(graphqlIntrospection),
        // Subgraph: CSRF prevention not needed (server-to-server)
        csrfPrevention: false,
      };
    }
    
    // Standard server configuration
    return {
      ...rest,
      typeDefs,
      resolvers,
      plugins: [landingPagePlugin, httpDrainPlugin],
      introspection: nodeEnv !== 'production' && Boolean(graphqlIntrospection),
      csrfPrevention: true, // browser-facing → enable
    };
  },
  constructible: ApolloServer,
  deps: {},
  locateDeps: {
    ...prefixValue('loaderHandles'),
    ...prefixValue('typeDefs'),
    ...prefixValue('resolvers'),
    ...prefixValue('isSubgraph'),
    landingPagePlugin: 'apolloLandingPagePlugin',
    httpDrainPlugin: 'apolloHttpDrainPlugin',
  },
  async after({ me: apolloServer, serviceLocator }) {
    const logger = await serviceLocator.get<Logger>('logger');
    const isSubgraph = await serviceLocator.get<boolean | undefined>(prefixHandle('isSubgraph')).catch(() => undefined);

    logger.log(`🚀 Starting Apollo (${isSubgraph ? 'subgraph' : 'public graph w/ cookies'}) 🚀`);
    // We start the server (make sure it's before attaching it to express)
    await apolloServer.start();
    logger.log('🚀 Started Apollo 🚀');

    return apolloServer;
  }
};

export default loadDictElement;