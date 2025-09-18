import { LoadDictElement } from 'di-why/build/src/DiContainer';
import { UnknownEnv } from 'swiss-army-knifey';
import { prefixHandle } from '../utils/prefixHandle';

export type AppConfigMap<R = any> = (env: UnknownEnv) => R;

const loadDictElement: LoadDictElement<ReturnType<any>> = {
  locateDeps: {
    mergedAppConfigMaps: prefixHandle('appConfigMap'),
    env: 'env',
  },
  factory: function ({ env, mergedAppConfigMaps }: { env: UnknownEnv; mergedAppConfigMaps: AppConfigMap}) {
    return mergedAppConfigMaps(env);
  },
};

export default loadDictElement;