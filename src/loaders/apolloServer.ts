import { ApolloServer } from '@apollo/server';
import { LoadDictElement } from 'di-why/build/src/DiContainer';
import type { Logger } from 'saylo';
import { prefixValue } from '../utils/prefixHandle';
import { CustomizableLoaderHandles } from '../utils/loadDictGenerator/customizableLoaderHandles';

const loadDictElement: LoadDictElement<ApolloServer<any>> = {
  async before({
    deps: {
      loaderHandles,
      landingPagePlugin,
      httpDrainPlugin,
      ...rest
    },
    serviceLocator
  }) {
    const appConfig = await serviceLocator.get<any>((loaderHandles as CustomizableLoaderHandles).appConfig);
    const { nodeEnv, graphqlIntrospection } = appConfig;
    return {
      ...rest,
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
    landingPagePlugin: 'apolloLandingPagePlugin',
    httpDrainPlugin: 'apolloHttpDrainPlugin',
  },
  async after({ me: apolloServer, serviceLocator }) {
    const logger = await serviceLocator.get<Logger>('logger');

    logger.log('🚀 Starting Apollo (public graph w/ cookies) 🚀');
    // We start the server (make sure it's before attaching it to express)
    await apolloServer.start();
    logger.log('🚀 Started Apollo 🚀');

    return apolloServer;
  }
};

export default loadDictElement;