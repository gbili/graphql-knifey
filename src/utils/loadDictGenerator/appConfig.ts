import { LoadDictElement } from 'di-why/build/src/DiContainer';

export type UknownEnv = Partial<{ [k: string]: string; }>;

function loadDictElementGen(appConfigGen: (env: UknownEnv) => any) {
  type AppConfig = ReturnType<typeof appConfigGen>;
  const loadDictElement: LoadDictElement<AppConfig> = {
    before: async function ({ serviceLocator }) {
      const env = await serviceLocator.get('env');
      return {
        env
      };
    },
    factory: function ({ env }: { env: UknownEnv}) {
      return appConfigGen(env);
    },
  };
  return loadDictElement;
};

export default loadDictElementGen;