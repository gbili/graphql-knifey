import ctx from "./utils/loadDictGenerator/apolloContext";
import subgraphServerLDE from "./loaders/apolloSubgraphServer";
import loadDictGenGen from "./utils/loadDictGenerator/apolloServerModular";
import standaloneServerLDE from "./loaders/apolloStandaloneServer";
import cfg from "./loaders/appConfig";
import deDoub from "./utils/deDoubleEscape";
import lschem from "./utils/loadSchema";
import { loadDict } from "./loaders";
import { authenticateRequestAndPlugUserInInput as authenticateHelper } from "./utils/resolverAuthenticateHelper";
import { getFailOutcomeFromError as getFOFE } from "./utils/getFailOutcomeFromError";
import { mergeAppConfigMaps as acmMerger } from "./utils/mergeAppConfigMaps";
import appConfigMap from "./config/appConfig";
import {
  prefixHandle,
  prefixBoth,
  prefixValue,
  retunDepsInjectDecustomizedHandle
} from "./utils/prefixHandle";
import {
  customizableLoaderHandles,
  type CustomizableLoaderHandles,
  type CustomizableLoaderHandlesKeys,
  type PrefixedHandles
} from "./utils/loadDictGenerator/customizableLoaderHandles";

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
export { subgraphServerLDE, standaloneServerLDE };
export const apolloSubgraphServerModularLDGen = loadDictGenGen(true);
export const apolloStandaloneServerModularLDGen = loadDictGenGen(false);

// Export Apollo modular types
export type {
  ApolloSubgraphServerConfigParam,
  LocatorHandles as ApolloLocatorHandles,
  Resolvers as ApolloResolvers,
} from './utils/loadDictGenerator/apolloServerModular';

export type {
  ApolloStandaloneServerConfigParams,
  Resolvers as ApolloSubgraphResolvers,
} from './utils/loadDictGenerator/apolloServerModular';

export const appConfigLDEGen = cfg;

export type { GQLResolverDict, ActionOutcomeError, ActionOutcomeForbidden, ActionOutcomeSuccess, ActionOutcomeFail, ActionStatus, UUIDProp, UUID } from "./generalTypes";

export const authenticateRequestAndPlugUserInInput = authenticateHelper;
export const getFailOutcomeFromError = getFOFE;
export const mergeToDefaultAppConfigMap = acmMerger(appConfigMap);

export const deDoubleEscape = deDoub;
export const loadSchema = lschem;

export const graphqlKnifeyLoadDict = loadDict;

// Export prefix utilities and types
export {
  prefixHandle,
  prefixBoth,
  prefixValue,
  retunDepsInjectDecustomizedHandle,
  customizableLoaderHandles,
  type CustomizableLoaderHandles,
  type CustomizableLoaderHandlesKeys,
  type PrefixedHandles,
};

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

export default graphqlKnifeyLoadDict;