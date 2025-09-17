import { LoadDictElement } from "di-why/build/src/DiContainer";
import { prefixValue } from "../../utils/prefixHandle";
import { ApolloServerPlugin } from "@apollo/server";

const loadDictElement: LoadDictElement<ApolloServerPlugin[]> = {
  before: async ({ serviceLocator, deps: { isSubgraph } }) => {
    const a = await serviceLocator.get('apolloHttpDrainPlugin');
    if (isSubgraph) {
      const b = await serviceLocator.get('apolloLandingPagePlugin');
      return [a, b];
    }
    return [a];
  },
  factory: (loadedPluginsList) => {
    return loadedPluginsList;
  },
  locateDeps: {
    ...prefixValue('isSubgraph'),
  },
}

export default loadDictElement;