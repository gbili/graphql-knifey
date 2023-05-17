import 'dotenv/config';
import { LoadDictElement } from 'di-why/build/src/DiContainer';

const env: { [k: string]: string; } = {};

function hasKey(env: any, key: string) {
  return (env[key] || '').length > 0;
}

function getFormatedKey(env: any, keyInEnv: string): string {
  if (!hasKey(env, keyInEnv)) {
    throw new Error(`Trouble loading process.env.${keyInEnv}`);
  }
  const val: string = env[keyInEnv];
  return val;
}

const pubKeyInEnv = 'JWT_KEY_PUBLIC';
env[pubKeyInEnv] = getFormatedKey(process.env, pubKeyInEnv);

if (!hasKey(process.env, 'JWT_ALGORITHM')) {
  env['JWT_ALGORITHM'] = 'RS256';
}

function hasDBEnvVars(env: any) {
  return hasKey(env, 'DB_HOST') && hasKey(env, 'DB_USER') && hasKey(env, 'DB_USER') && hasKey(env, 'DB_PASSWORD');
}

if (!hasDBEnvVars(process.env)) {
  throw new Error('Missing some Db Env Vars');
}


process.env = {
  ...process.env,
  ...env,
}

console.log('JWT', env.JWT_KEY_PUBLIC);

const loadDictElement: LoadDictElement<object> = {
  instance: {
    ...process.env,
    ...env,
  },
};

export default loadDictElement;