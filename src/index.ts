import { LoadDictElement, LocatableServicesDict } from "di-why/build/src/DiContainer";
import env from "./loaders/env";
import events from "./loaders/events";
import mysqlMultipleReq from "./loaders/mysqlMultipleReq";
import mysqlReq from "./loaders/mysqlReq";
import apolloContextLDEGen from "./utils/loadDictGenerator/apolloContext";
import apolloServerLDEGen, { LocatorHandles, Resolvers } from "./utils/loadDictGenerator/apolloServer";
import appConfigLDEGen, { UknownEnv } from "./utils/loadDictGenerator/appConfig";
import { EventsInterface } from "jwt-authorized/build/src/loaders/events";
import MysqlReq from "mysql-oh-wait";
import { HeaderAuthTokenExtractor } from "jwt-authorized";
import { ApolloServer, gql } from "apollo-server";

export const defaultDict: {
  env: LoadDictElement<object>;
  events: LoadDictElement<EventsInterface>;
  mysqlMultipleReq: LoadDictElement<MysqlReq>;
  mysqlReq: LoadDictElement<MysqlReq>;
} = {
  env,
  events,
  mysqlMultipleReq,
  mysqlReq,
};

export const apolloContextGen: (locatableServicesDict: LocatableServicesDict) => LoadDictElement<typeof HeaderAuthTokenExtractor["getAsyncContextReqMethod"]> = apolloContextLDEGen;
export const apolloServerGen: (resolvers: Resolvers<any>, typeDefs: ReturnType<typeof gql>, handles?: LocatorHandles) => LoadDictElement<ApolloServer> = apolloServerLDEGen;
export const appConfigGen: (appConfigGen: (env: UknownEnv) => any) => LoadDictElement<ReturnType<typeof appConfigGen>> = appConfigLDEGen;

export default defaultDict;