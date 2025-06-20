import { HeaderAuthTokenExtractor } from 'jwt-authorized';
import { LoadDictElement, LocatableServicesDict } from 'di-why/build/src/DiContainer';
import { entriesMap } from 'swiss-army-knifey';
import { extractTokenAndIPAddressFromRequestIntoContext } from '../plugIPAddressIntoContext';

function loadDictElementGen(locatableServices: LocatableServicesDict) {
  const loadDictElement: LoadDictElement = {
    instance: HeaderAuthTokenExtractor,
    async after({ me, serviceLocator }: { me: typeof HeaderAuthTokenExtractor; serviceLocator: { get: <T>(p: string) => Promise<T>}; }) {
      const context = await entriesMap(locatableServices, serviceLocator.get.bind(serviceLocator));
      return extractTokenAndIPAddressFromRequestIntoContext(me, context);
    },
  };
  return loadDictElement;
}

export default loadDictElementGen;
