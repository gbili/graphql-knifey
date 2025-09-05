import { LoadDictElement } from 'di-why/build/src/DiContainer';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerPluginLandingPageGraphQLPlayground } from '@apollo/server-plugin-landing-page-graphql-playground';
import type { ApolloServerPlugin } from '@apollo/server';

const loadDictElement: LoadDictElement<ApolloServerPlugin> = {
  factory({ appConfig }: { appConfig: any }) {
    const { nodeEnv, graphqlPlayground } = appConfig;
    const isProd = nodeEnv === 'production';

    if (!isProd && graphqlPlayground) {
      return ApolloServerPluginLandingPageGraphQLPlayground();
    }
    return ApolloServerPluginLandingPageDisabled();
  },
  locateDeps: {
    appConfig: 'appConfig'
  }
};

export default loadDictElement;