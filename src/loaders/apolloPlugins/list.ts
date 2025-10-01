import { LoadDictElement } from "di-why/build/src/DiContainer";
import { ApolloServerPlugin } from "@apollo/server";

const loadDictElement: LoadDictElement<ApolloServerPlugin[]> = {
  before: async ({ serviceLocator, deps: { serverType } }) => {
    const a = await serviceLocator.get('apolloHttpDrainPlugin');
    if (serverType === 'subgraph') {
      const b = await serviceLocator.get('apolloLandingPagePlugin');
      return [a, b];
    }
    return [a];
  },
  factory: (loadedPluginsList) => {
    return loadedPluginsList;
  },
  locateDeps: {
    serverType: 'serverType',
  },
}

export default loadDictElement;