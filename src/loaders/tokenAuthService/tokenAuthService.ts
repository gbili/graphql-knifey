import { GetInstanceType, LoadDictElement } from "di-why/build/src/DiContainer";
import { TokenAuthCustomizableService, TokenUser } from "jwt-authorized";

const loadDictElement: LoadDictElement<GetInstanceType<typeof TokenAuthCustomizableService>> = {
  constructible: TokenAuthCustomizableService,
  deps: {
    models: {
      TokenUser,
    },
  },
  locateDeps: {
    events: 'events',
    env: 'env',
    tokenConfig: 'tokenConfig',
  },
};

export default loadDictElement;