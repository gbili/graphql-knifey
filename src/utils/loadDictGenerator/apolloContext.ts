import { HeaderAuthTokenExtractor } from 'jwt-authorized';
import { LoadDictElement, LocatableServicesDict } from 'di-why/build/src/DiContainer';
import { entriesMap } from 'swiss-army-knifey';

function loadDictElementGen(locatableServices: LocatableServicesDict) {
  const loadDictElement: LoadDictElement = {
    instance: HeaderAuthTokenExtractor,
    async after({ me, serviceLocator }: { me: typeof HeaderAuthTokenExtractor; serviceLocator: { get: <T>(p: string) => Promise<T>}; }) {
      const context = await entriesMap(locatableServices, serviceLocator.get.bind(serviceLocator));
      return me.getAsyncContextReqMethod(context);
    },
  };
  return loadDictElement;
}

export default loadDictElementGen;
