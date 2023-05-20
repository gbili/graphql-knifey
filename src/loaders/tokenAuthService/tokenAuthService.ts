import TokenAuthService from 'jwt-authorized/build/src/services/TokenAuthService';
import { TokenUser } from 'jwt-authorized/build/src/models';
import { LoadDictElement, GetInstanceType } from 'di-why/build/src/DiContainer';

const loadDictElement: LoadDictElement<GetInstanceType<typeof TokenAuthService>> = {
  constructible: TokenAuthService,
  deps: {
    models: {
      TokenUser
    },
  },
  locateDeps: {
    tokenConfig: 'tokenConfig',
    events: 'events',
  },
};

export default loadDictElement;