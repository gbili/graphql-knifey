import { LoadDictElement, LocatableServicesDict } from 'di-why/build/src/DiContainer';
import { entriesMap } from 'swiss-army-knifey';
import {
  createAuthContext,
  AuthContextParams,
  AuthContextDependencies,
  AuthContextResult,
  AuthMode
} from '../createAuthContext';
import { GKAppConfigMap } from '../../config/appConfig';

export interface ApolloContextWithAuthConfig {
  authMode?: AuthMode;
  sessionCookieName?: string;
  refreshCookieName?: string;
}

// Re-export for backward compatibility
export type PublicGraphContextWithAuth = AuthContextResult;

type ContextFactory = (params: AuthContextParams) => Promise<AuthContextResult>;

/**
 * Creates an Apollo context loader with built-in authentication support.
 *
 * @param locatableServices - Map of context property names to service handles
 *
 * Example: (pass watever resolvers will need)
 * apolloContextWithAuthLDEGen({
 *   authService: 'authService',
 *   userService: 'userService',
 * })
 */
export const apolloContextWithAuthLDEGen = (
  locatableServices: LocatableServicesDict = {}
): LoadDictElement<ContextFactory> => {
  return {
    // Services to locate from DI container (optional, may not exist)
    locateDeps: {
      authStrategy: 'authStrategy',
      sessionService: 'sessionService',
      sessionAdapter: 'sessionAdapter',
      appConfig: 'appConfig',
    },

    before: async ({ deps, serviceLocator }) => {
      // Load the requested services using entriesMap
      const sharedContext = await entriesMap(locatableServices, serviceLocator.get.bind(serviceLocator));

      const {
        authMode = 'cookie',
        sessionCookieName = 'sid',
        refreshCookieName = 'rid',
      } = (deps.appConfig as ReturnType<GKAppConfigMap>) || {};

      // Return all deps for the factory
      // Note: authStrategy, sessionService, sessionAdapter may be undefined if not found
      // That's OK - they're optional
      return {
        config: {
          authMode,
          sessionCookieName,
          refreshCookieName,
          ...deps,
        },
        sharedContext,
      } as AuthContextDependencies;
    },

    // Factory creates the context function using the dependencies
    factory: (deps: AuthContextDependencies): ContextFactory => {
      // Return the context factory function that Apollo will call for each request
      return async (params: AuthContextParams): Promise<AuthContextResult> => {
        return createAuthContext(params, deps);
      };
    },
  };
};