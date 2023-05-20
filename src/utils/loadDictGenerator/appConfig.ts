import { LoadDictElement } from 'di-why/build/src/DiContainer';

export type UnknownEnv = Partial<{ [k: string]: string; }>;
export type AppConfigMap<R = any> = (env: UnknownEnv) => R;

function loadDictElementGen<T extends AppConfigMap<any>>(appConfigMap: T): LoadDictElement<ReturnType<T>> {
  const loadDictElement: LoadDictElement<ReturnType<T>> = {
    before: async function ({ serviceLocator }) {
      const env = await serviceLocator.get('env');
      return {
        env
      };
    },
    factory: function ({ env }: { env: UnknownEnv}) {
      return appConfigMap(env);
    },
  };
  return loadDictElement;
};

export default loadDictElementGen;