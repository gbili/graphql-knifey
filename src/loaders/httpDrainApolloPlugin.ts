import { LoadDictElement } from 'di-why/build/src/DiContainer';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

const loadDictElement: LoadDictElement<ReturnType<typeof ApolloServerPluginDrainHttpServer>> = {
  factory: ({ httpServer }) => ApolloServerPluginDrainHttpServer({ httpServer }),
  locateDeps: {
    app: 'httpServer',
  }
};

export default loadDictElement;