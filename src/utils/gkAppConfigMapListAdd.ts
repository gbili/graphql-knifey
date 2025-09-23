import { AppConfigNamespace } from 'di-why';
import { prefixHandle } from './prefixHandle';

export const gkAppConfigMapNamespace: AppConfigNamespace = {
  namespace: prefixHandle('gkAppConfigMap'),
  priority: 50,
};