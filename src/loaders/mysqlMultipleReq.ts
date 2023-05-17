import mysql from 'mysql';
import { MysqlReq } from 'mysql-oh-wait';
import { LoadDictElement, GetInstanceType } from 'di-why/build/src/DiContainer';

const loadDictElement: LoadDictElement<GetInstanceType<typeof MysqlReq>> = {
  constructible: MysqlReq,
  deps: {
    adapter: mysql,
    connectionConfig: {
      multipleStatements: true,
      ...MysqlReq.extractConfigFromEnv(process.env),
    },
  },
  locateDeps: {
    logger: 'logger',
  },
};
export default loadDictElement;
