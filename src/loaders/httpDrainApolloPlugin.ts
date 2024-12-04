import { LoadDictElement } from 'di-why/build/src/DiContainer';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

const loadDictElement: LoadDictElement<ReturnType<typeof ApolloServerPluginDrainHttpServer>> = {
  factory: ({ httpServer }) => ApolloServerPluginDrainHttpServer({ httpServer }),
  locateDeps: {
    httpServer: 'httpServer',
  }
};

export default loadDictElement;