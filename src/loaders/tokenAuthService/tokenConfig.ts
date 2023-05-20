import tokenConfigGenerator, { TokenConfig } from 'jwt-authorized/build/src/config/tokenConfigGenerator';
import { LoadDictElement } from 'di-why/build/src/DiContainer';
import getValidAlgorithmAndKeysObject from 'jwt-authorized/build/src/utils/validateAlgorithAndKeys';

const loadDictElement: LoadDictElement<TokenConfig> = {
  factory: ({ env }) => {
    const algorithm = env.JWT_ALGORITHM || 'HS256';
    const hoursBeforeExpire = env.JWT_HOURS_BEFORE_EXPIRE || '1';
    const privateKey = (env.JWT_KEY_PRIVATE || '').split('\\n').join("\n");
    const publicKey = (env.JWT_KEY_PUBLIC || '').split('\\n').join("\n");

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