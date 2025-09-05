import { LoadDictElement } from 'di-why/build/src/DiContainer';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPlugin } from '@apollo/server';

const loadDictElement: LoadDictElement<ApolloServerPlugin> = {
  factory: ({ httpServer }) => ApolloServerPluginDrainHttpServer({ httpServer }),
  locateDeps: {
    httpServer: 'httpServer',
  }
};

export default loadDictElement;