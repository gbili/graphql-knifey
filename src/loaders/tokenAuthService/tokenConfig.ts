import tokenConfigGenerator, { TokenConfig } from 'jwt-authorized/build/src/config/tokenConfigGenerator';
import { LoadDictElement } from 'di-why/build/src/DiContainer';
import getValidAlgorithmAndKeysObject from 'jwt-authorized/build/src/utils/validateAlgorithAndKeys';
import deDoubleEscape from '../../utils/deDoubleEscape';

const loadDictElement: LoadDictElement<TokenConfig> = {
  factory: ({ env }) => {
    const algorithm = env.JWT_ALGORITHM || 'HS256';
    const hoursBeforeExpire = env.JWT_HOURS_BEFORE_EXPIRE || '1';
    const privateKey = deDoubleEscape(env, 'JWT_KEY_PRIVATE');
    const publicKey = deDoubleEscape(env, 'JWT_KEY_PUBLIC');
    const validHoursBeforeExpire = parseInt(hoursBeforeExpire);
    const algoAndKeys = getValidAlgorithmAndKeysObject(algorithm, privateKey, publicKey);

    return tokenConfigGenerator({
      expireTokensEveryNHours: validHoursBeforeExpire,
      ...algoAndKeys,
    });
  },
  locateDeps: {
    env: 'env',
  },
};

export default loadDictElement;