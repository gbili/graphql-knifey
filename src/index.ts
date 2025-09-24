import ctx from "./utils/loadDictGenerator/apolloContext";
import subgraphServerLDE from "./loaders/apolloSubgraphServer";
import loadDictGenGen from "./utils/loadDictGenerator/apolloServerModular";
import standaloneServerLDE from "./loaders/apolloStandaloneServer";
import deDoub from "./utils/deDoubleEscape";
import lschem from "./utils/loadSchema";
import { loadDict } from "./loaders";
import { authenticateRequestAndPlugUserInInput as authenticateHelper } from "./utils/resolverAuthenticateHelper";
import { getFailOutcomeFromError as getFOFE } from "./utils/getFailOutcomeFromError";
import { gkAppConfigMapNamespace } from "./utils/gkAppConfigMapListAdd";
import gkMergeAppConfigMap from "./utils/gkMergeAppConfigMap";

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
  Resolvers as ApolloResolvers,
  LoadDictGenParams,
} from './utils/loadDictGenerator/apolloServerModular';

export type {
  ApolloStandaloneServerConfigParams,
  Resolvers as ApolloSubgraphResolvers,
} from './utils/loadDictGenerator/apolloServerModular';


export type { Application, GQLResolverDict, ActionOutcomeError, ActionOutcomeForbidden, ActionOutcomeSuccess, ActionOutcomeFail, ActionStatus, UUIDProp, UUID } from "./generalTypes";

export const authenticateRequestAndPlugUserInInput = authenticateHelper;
export const getFailOutcomeFromError = getFOFE;

export const deDoubleEscape = deDoub;
export const loadSchema = lschem;

export const graphqlKnifeyLoadDict = loadDict;
export { gkAppConfigMapNamespace };
export { gkMergeAppConfigMap };

// Export middleware types from express-knifey
export type {
  MiddlewareAttacher,
  MiddlewareConfig,
  MiddlewarePathConfig,
} from 'express-knifey';

export {
  GRAPHQL_MIDDLEWARE,
  createGraphqlMiddlewareConfig,
  graphqlMiddlewareHandle,
} from './middleware';

export type {
  GraphqlMiddlewareConfigOptions,
  GraphqlMiddlewareHandle,
} from './middleware';

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
