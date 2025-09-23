import { createAppConfigMapListAdder, AppConfigNamespace } from 'di-why/build/src/index';
import { prefixHandle } from './prefixHandle';

export const gkAppConfigMapNamespace: AppConfigNamespace = {
  namespace: prefixHandle('gkAppConfigMap'),
  priority: 50,
};

export const gkAppConfigMapListAdd = createAppConfigMapListAdder([gkAppConfigMapNamespace]);

export default gkAppConfigMapListAdd;