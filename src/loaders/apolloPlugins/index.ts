import { LoadDict } from 'di-why/build/src/DiContainer';

import apolloLandingPagePlugin from './landingPagePlugin';
import apolloHttpDrainPlugin from './httpDrainPlugin';

export { apolloLandingPagePlugin, apolloHttpDrainPlugin };

const loadDict: LoadDict = {
  apolloLandingPagePlugin,
  apolloHttpDrainPlugin
};

export default loadDict;