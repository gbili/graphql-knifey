import mysql from 'mysql';
import { MysqlReq } from 'mysql-oh-wait';
import { LoadDictElement, GetInstanceType } from 'di-why/build/src/DiContainer';

const loadDictElement: LoadDictElement<GetInstanceType<typeof MysqlReq>> = {
  before: ({ deps }) => {
    return {
      ...deps,
      connectionConfig: {
        ...deps.connectionConfig,
        multipleStatements: true,
      },
    };
  },
  constructible: MysqlReq,
  deps: {
    adapter: mysql,
  },
  locateDeps: {
    connectionConfig: 'mysqlConnectionConfig',
    logger: 'logger',
  },
};
export default loadDictElement;
