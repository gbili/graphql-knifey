import tokenConfigGenerator, { TokenConfig } from 'jwt-authorized/build/src/config/tokenConfigGenerator';
import { LoadDictElement } from 'di-why/build/src/DiContainer';
import getValidAlgorithmAndKeysObject from 'jwt-authorized/build/src/utils/validateAlgorithAndKeys';
import deDoubleEscape from '../../utils/deDoubleEscape';

const loadDictElement: LoadDictElement<TokenConfig> = {
  factory: ({ appConfig }) => {
    if (!appConfig.jwtKeyPublic) throw new Error('Missing appConfig.jwtKeyPublic for JWT validation');
    if (!appConfig.jwtAlgorithm) throw new Error('Missing appConfig.jwtAlgorithm for JWT validation');
    if (!appConfig.jwtAudience) throw new Error('Missing appConfig.jwtAudience for JWT validation');
    if (!appConfig.jwtHoursBeforeExpire) throw new Error('Missing appConfig.jwtHoursBeforeExpire for JWT minting');

    const algoAndKeys = getValidAlgorithmAndKeysObject(
      appConfig.jwtAlgorithm,
      deDoubleEscape(appConfig, 'jwtKeyPrivate'),
      deDoubleEscape(appConfig, 'jwtKeyPublic')
    );

    return tokenConfigGenerator({
      expireTokensEveryNHours: appConfig.jwtHoursBeforeExpire,
      ...{ requiredAud: appConfig.jwtAudience },
      ...algoAndKeys,
    });
  },
  locateDeps: {
    appConfig: 'appConfig',
  },
};

export default loadDictElement;