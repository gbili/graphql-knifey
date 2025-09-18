import { LoadDictElement } from 'di-why/build/src/DiContainer';
import { UnknownEnv } from 'swiss-army-knifey';
import { CustomizableLoaderHandles } from '..';
import { prefixValue } from '../utils/prefixHandle';
import { mergeAppConfigMaps } from '../utils/mergeAppConfigMaps';
import appConfigMap from '../config/appConfig';
import { Logger } from 'saylo';

export type AppConfigMap<R = any> = (env: UnknownEnv) => R;


const loadDictElement: LoadDictElement<ReturnType<AppConfigMap>> = {
  before: async function ({ serviceLocator, deps: { loaderHandles } }) {
    const lh = loaderHandles as CustomizableLoaderHandles;
    const userAppConfigMap = serviceLocator.couldLoad(lh.appConfigMap)
      ? await serviceLocator.get(lh.appConfigMap)
      : (_: UnknownEnv) => ({});
    if (lh.appConfig !== 'appConfig') {
      const logger = await serviceLocator.get<Logger>(lh.logger);
      logger.log(`WARNING: you are using your own "appConfig" load dict handle, which means you are responsible for merging your appConfig with this package's appConfig (see src/loaders/appConfigMapMerger). If this was intentional, great! If not, leave appConfig's loaderHandle's value to 'appConfig', and we will merge for you (using your 'appConfigMap')`);
    }
    return {
      userAppConfigMap,
    };
  },
  locateDeps: {
    ...prefixValue('loaderHandles'),
  },
  factory: function ({ userAppConfigMap }: { userAppConfigMap: AppConfigMap }) {
    return mergeAppConfigMaps(userAppConfigMap)(appConfigMap);
  },
};

export default loadDictElement;