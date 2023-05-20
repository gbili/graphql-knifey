import { MysqlReq } from 'mysql-oh-wait';
import { LoadDictElement } from 'di-why/build/src/DiContainer';
import { ConfigPropsOptional } from 'mysql-oh-wait/build/src/MysqlReq';

const loadDictElement: LoadDictElement<ConfigPropsOptional & { multipleStatements: boolean; }> = {
  factory: ({ env }) => {
    const connectionConfig = {
      multipleStatements: false,
      ...MysqlReq.extractConfigFromEnv(env),
    };
    return connectionConfig;
  },
  locateDeps: {
    env: 'env',
  },
};

export default loadDictElement;
