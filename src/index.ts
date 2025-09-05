import ctx from "./utils/loadDictGenerator/apolloContext";
import subgraphServerLoaderGen from "./utils/loadDictGenerator/apolloSubgraphServer";
import standaloneServerLoaderGen from "./utils/loadDictGenerator/apolloStandaloneServer";
import standaloneServerModularLoaderGen from "./utils/loadDictGenerator/apolloStandaloneServerModular";
import cfg from "./utils/loadDictGenerator/appConfig";
import deDoub from "./utils/deDoubleEscape";
import lschem from "./utils/loadSchema";
import di from "./loaders";
import { authenticateRequestAndPlugUserInInput as authenticateHelper } from "./utils/resolverAuthenticateHelper";
import { getFailOutcomeFromError as getFOFE } from "./utils/getFailOutcomeFromError";
import { mergeAppConfigMaps as acmMerger } from "./utils/mergeAppConfigMaps";
import appConfigMap from "./config/appConfig";

// New auth-related imports
import sessionServiceLDEGen, { SessionService, SessionServiceInterface, SessionData } from "./services/SessionService";
import {
  AuthStrategy,
  CookieSessionStrategy,
  JWTStrategy,
  cookieStrategyLDEGen,
  jwtStrategyLDEGen,
  AuthResult,
  ValidationResult
} from "./services/AuthStrategy";
import {
  SessionToJWTAdapter,
  AuthServiceAdapter,
  sessionToJWTAdapterLDEGen,
  authServiceAdapterLDEGen
} from "./services/AuthMigrationAdapter";
import {
  apolloContextWithAuthLDEGen,
  PublicGraphContextWithAuth
} from "./utils/loadDictGenerator/apolloContextWithAuth";
import {
  createAuthContext,
  type AuthContextParams,
  type AuthContextDependencies,
  type AuthContextResult,
  type AuthMode
} from "./utils/createAuthContext";

export const apolloContextLDEGen = ctx;
export const apolloSubgraphServerLDEGen = subgraphServerLoaderGen;
export const apolloStandaloneServerLDEGen = standaloneServerLoaderGen;
export const apolloStandaloneServerModularLDEGen = standaloneServerModularLoaderGen;

export const appConfigLDEGen = cfg;

export type { GQLResolverDict, ActionOutcomeError, ActionOutcomeForbidden, ActionOutcomeSuccess, ActionOutcomeFail, ActionStatus, UUIDProp, UUID } from "./generalTypes";

export const authenticateRequestAndPlugUserInInput = authenticateHelper;
export const getFailOutcomeFromError = getFOFE;
export const mergeToDefaultAppConfigMap = acmMerger(appConfigMap);

export const deDoubleEscape = deDoub;
export const loadSchema = lschem;

export const diContainer = di;

// Export new auth-related functionality
export {
  // Session Service
  sessionServiceLDEGen,
  SessionService,
  type SessionServiceInterface,
  type SessionData,

  // Auth Strategies
  type AuthStrategy,
  CookieSessionStrategy,
  JWTStrategy,
  cookieStrategyLDEGen,
  jwtStrategyLDEGen,
  type AuthResult,
  type ValidationResult,

  // Migration Adapters
  SessionToJWTAdapter,
  AuthServiceAdapter,
  sessionToJWTAdapterLDEGen,
  authServiceAdapterLDEGen,

  // Enhanced Apollo Context
  apolloContextWithAuthLDEGen,
  createAuthContext,
  type AuthContextParams,
  type AuthContextDependencies,
  type AuthContextResult,
  type AuthMode,
  type PublicGraphContextWithAuth,
};

export default diContainer;