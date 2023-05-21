import 'dotenv/config';
import { LoadDictElement } from 'di-why/build/src/DiContainer';
import { UnknownEnv, areDBKeysInEnv, envHasKeyGen, getTypedKey } from 'swiss-army-knifey';

const env: UnknownEnv = {};

const pubKeyInEnv = 'JWT_KEY_PUBLIC';
env[pubKeyInEnv] = getTypedKey(process.env, pubKeyInEnv);
const hasKey = envHasKeyGen(process.env);

if (!hasKey('JWT_ALGORITHM')) {
  env['JWT_ALGORITHM'] = 'RS256';
}

if (!areDBKeysInEnv(process.env)) {
  throw new Error('Missing some Db Env Vars');
}

const loadDictElement: LoadDictElement<object> = {
  instance: {
    ...{
      LOGGER_LOG: '0',
      LOGGER_DEBUG: '1',
    },
    ...process.env,
    ...env,
  },
};

export default loadDictElement;