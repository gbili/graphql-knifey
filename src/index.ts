import ctx from "./utils/loadDictGenerator/apolloContext";
import srv from "./utils/loadDictGenerator/apolloServer";
import cfg from "./utils/loadDictGenerator/appConfig";
import deDoub from "./utils/deDoubleEscape";
import lschem from "./utils/loadSchema";
import di from "./loaders";
import { authenticateRequestAndPlugUserInInput as authenticateHelper } from "./utils/resolverAuthenticateHelper";
import { getFailOutcomeFromError as getFOFE } from "./utils/getFailOutcomeFromError";
import { mergeAppConfigMaps as acmMerger } from "./utils/mergeAppConfigMaps";
import appConfigMap from "./config/appConfig";
import { apolloDepsDict } from "./utils/loadDictGenerator/apolloDepsDict";

export const apolloContextLDEGen = ctx;
export const apolloServerLDEGen = srv;

export const apolloServerDepsLoadDict = apolloDepsDict;

export const appConfigLDEGen = cfg;

export type { GQLResolverDict, ActionOutcomeError, ActionOutcomeForbidden, ActionOutcomeSuccess, ActionOutcomeFail, ActionStatus, UUIDProp, UUID } from "./generalTypes";

export const authenticateRequestAndPlugUserInInput = authenticateHelper;
export const getFailOutcomeFromError = getFOFE;
export const mergeToDefaultAppConfigMap = acmMerger(appConfigMap);

export const deDoubleEscape = deDoub;
export const loadSchema = lschem;

export const diContainer = di;

export default diContainer;