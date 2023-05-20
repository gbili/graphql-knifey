import ctx from "./utils/loadDictGenerator/apolloContext";
import srv from "./utils/loadDictGenerator/apolloServer";
import cfg from "./utils/loadDictGenerator/appConfig";
import di from "./loaders";
import { authenticateRequestAndPlugUserInInput as authenticateHelper } from "./utils/resolverAuthenticateHelper";
import { getFailOutcomeFromError as getFOFE } from "./utils/getFailOutcomeFromError";
import { mergeAppConfigMaps as acmMerger } from "./utils/mergeAppConfigMaps";
import appConfigMap from "./config/appConfig";

export const apolloContextLDEGen = ctx;
export const apolloServerLDEGen = srv;
export const appConfigLDEGen = cfg;

export const authenticateRequestAndPlugUserInInput = authenticateHelper;
export type { GqlResolversContextParams } from "./utils/resolverAuthenticateHelper";
export const getFailOutcomeFromError = getFOFE;
export const mergeToDefaultAppConfigMap = acmMerger(appConfigMap);

export const diContainer = di;

export default diContainer;