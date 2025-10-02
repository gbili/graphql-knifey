import { LoadDictElement } from 'di-why/build/src/DiContainer';
import { expressMiddleware } from '@apollo/server/express4';
import type { ApolloServer } from '@apollo/server';
import type { Logger } from 'saylo';
import type { Request, Response, Application } from 'express';
import { makeCookieHelpers } from '../../utils/cookieHelper';
import { MiddlewareAttacher } from 'express-knifey';

export type PublicGraphContext = {
  req: Request;
  res: Response;
  sessionId?: string | null;
  refreshId?: string | null;
  setAuthCookies: (args: {
    sessionId?: string | null;
    refreshId?: string | null;
    sessionMaxAgeSec?: number;
    refreshMaxAgeSec?: number;
  }) => void;
  clearAuthCookies: () => void;
  [k: string]: any;
};

const loadDictElement: LoadDictElement<MiddlewareAttacher> = {
  // IMPORTANT, this is where we load apolloServer
  before: async ({ serviceLocator, deps: { appConfig, serverType, app, apolloContext, logger } }) => {
    // Determine which Apollo server type to load based on serverType config
    const apolloServerHandle = (() => {
      if (serverType === 'subgraph') return 'apolloSubgraphServer';
      if (serverType === 'gateway') return 'apolloGatewayServer';
      return 'apolloStandaloneServer';
    })();

    if (!serviceLocator.couldLoad(apolloServerHandle)) {
      throw new Error(`With the current setup, there is no way to load an apolloServer instance. serverType: ${serverType}, trying to load: ${apolloServerHandle}`);
    };

    return {
      app,
      apolloServer: await serviceLocator.get(apolloServerHandle),
      apolloContext,
      appConfig,
      logger,
      serverType,
    };
  },
  locateDeps: {
    app: 'app',
    apolloContext: 'apolloContext',
    appConfig: 'appConfig',
    logger: 'logger',
    serverType: 'serverType',
  },
  factory({
    app,
    apolloServer,
    apolloContext,
    appConfig,
    logger,
    serverType
  }: {
    app: Application;
    apolloServer: ApolloServer<any>;
    apolloContext: any;
    appConfig: any;
    logger: Logger;
    serverType?: 'subgraph' | 'gateway' | 'standalone';
  }) {
    const {
      cookieDomain,
      nodeEnv,
      accessCookieName = 'sid',
      refreshCookieName = 'rid',
      secureCookies
    } = appConfig;

    // Return a function that attaches the middleware when called
    return (path: string | '*') => {
      // GraphQL middleware requires a specific path, not global
      if (path === '*') {
        throw new Error('graphqlMiddleware requires a specific path, not global');
      }
      // Log GraphQL-specific information
      const typeLabel = serverType === 'subgraph' ? 'Subgraph' : (serverType === 'gateway' ? 'Gateway' : 'Standalone');
      logger.log(`✅ Apollo ${typeLabel} server configured at ${path}`);

      app.use(
        path,
        expressMiddleware(apolloServer, {
        context: async ({ req, res }): Promise<PublicGraphContext> => {
          logger.log('[APOLLO DEBUG] Context creation started');
          logger.log('[APOLLO DEBUG] Server type:', serverType);

          // For subgraphs, skip cookie and CSRF handling
          if (serverType === 'subgraph') {
            // Subgraphs only need basic context without cookies
            const extra = typeof apolloContext === 'function'
              ? await apolloContext({ req, res })
              : apolloContext;

            return {
              req,
              res,
              sessionId: null,
              refreshId: null,
              setAuthCookies: () => {},
              clearAuthCookies: () => {},
              ...extra,
            };
          }

          logger.log('[APOLLO DEBUG] Cookie parser available:', !!req.cookies);
          logger.log('[APOLLO DEBUG] Signed cookies available:', !!req.signedCookies);

          // CSRF protection is handled by Apollo Server's built-in csrfPrevention setting
          // See apolloGatewayServer.ts and apolloStandaloneServer.ts for configuration

          // Prefer signed cookies if cookieSecret is set and they exist
          const cookies = (req.signedCookies && Object.keys(req.signedCookies).length > 0)
            ? req.signedCookies
            : (req.cookies ?? {});
          logger.log('[APOLLO DEBUG] All cookies:', cookies);
          logger.log('[APOLLO DEBUG] Looking for cookies - access:', accessCookieName, 'refresh:', refreshCookieName);

          const sessionId = cookies[accessCookieName] ?? null;
          const refreshId = cookies[refreshCookieName] ?? null;
          logger.log('[APOLLO DEBUG] Found sessionId:', !!sessionId);
          logger.log('[APOLLO DEBUG] Found refreshId:', !!refreshId);

          const isProd = nodeEnv === 'production';
          const { setAuthCookies, clearAuthCookies } = makeCookieHelpers(res, {
            isProd,
            domain: cookieDomain,
            accessName: accessCookieName,
            refreshName: refreshCookieName,
            secureCookies,
          });
          logger.log('[APOLLO DEBUG] Cookie helpers created');
          logger.log('[APOLLO DEBUG] Cookie domain:', cookieDomain);
          logger.log('[APOLLO DEBUG] Is production:', isProd);

          // Merge any additional context your DI provides
          const extra = typeof apolloContext === 'function'
            ? await apolloContext({ req, res, sessionId, refreshId, setAuthCookies, clearAuthCookies })
            : apolloContext;
          logger.log('[APOLLO DEBUG] Extra context type:', typeof apolloContext);
          logger.log('[APOLLO DEBUG] Extra context keys:', extra ? Object.keys(extra) : 'none');

          return {
            req,
            res,
            sessionId,
            refreshId,
            setAuthCookies,
            clearAuthCookies,
            ...extra,
          };
        },
      })
    );
    };
  },
};

export default loadDictElement;