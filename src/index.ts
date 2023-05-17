import env from "./loaders/env";
import events from "./loaders/events";
import mysqlMultipleReq from "./loaders/mysqlMultipleReq";
import mysqlReq from "./loaders/mysqlReq";
import apolloContextGen from "./utils/loadDictGenerator/apolloContext";
import apolloServerGen from "./utils/loadDictGenerator/apolloServer";
import appConfigGen from "./utils/loadDictGenerator/appConfig";

export const defaultDict = {
  env,
  events,
  mysqlMultipleReq,
  mysqlReq,
};

export const loadDictElementGenerators = {
  apolloContextGen,
  apolloServerGen,
  appConfigGen,
};

export default defaultDict;