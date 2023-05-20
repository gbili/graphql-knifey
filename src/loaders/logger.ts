import { LoadDictElement } from 'di-why/build/src/DiContainer';
import { isMeantToBeTrue, loggerGen } from 'swiss-army-knifey';

export type LoggerInterface = ReturnType<typeof loggerGen>;

const loadDictElement: LoadDictElement<LoggerInterface> = {
  factory: function ({ env }) {
    return loggerGen({
      LOGGER_DEBUG: env.LOGGER_DEBUG !== undefined ? isMeantToBeTrue(env.LOGGER_DEBUG) : false,
      LOGGER_LOG:  env.LOGGER_LOG !== undefined ? isMeantToBeTrue(env.LOGGER_LOG) : true,
    });
  },
  locateDeps: {
    env: 'env',
  }
};

export default loadDictElement;
