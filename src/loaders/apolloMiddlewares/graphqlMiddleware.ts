import { LoadDictElement } from 'di-why/build/src/DiContainer';
import { expressMiddleware } from '@apollo/server/express4';
import type { ApolloServer } from '@apollo/server';
import type { Application } from '../app';
import type { Logger } from 'saylo';
import type { Request, Response } from 'express';
import { makeCookieHelpers } from '../../utils/cookieHelper';
import { prefixValue, retunDepsInjectDecustomizedHandle } from '../../utils/prefixHandle';

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

const loadDictElement: LoadDictElement<string> = {
  before: retunDepsInjectDecustomizedHandle('appConfig'),
  locateDeps: {
    app: 'app',
    apolloServer: 'apolloServer',
    apolloContext: 'apolloContext',
    logger: 'logger',
    ...prefixValue('loaderHandles'),
  },
  factory({
    app,
    apolloServer,
    apolloContext,
    appConfig,
    logger
  }: {
    app: Application;
    apolloServer: ApolloServer<any>;
    apolloContext: any;
    appConfig: any;
    logger: Logger;
  }) {
    const {
      graphqlPath,
      cookieDomain,
      nodeEnv,
      accessCookieName = 'sid',
      refreshCookieName = 'rid',
      secureCookies
    } = appConfig;

    app.use(
      graphqlPath,
      expressMiddleware(apolloServer, {
        context: async ({ req, res }): Promise<PublicGraphContext> => {
          logger.log('[APOLLO DEBUG] Context creation started');
          logger.log('[APOLLO DEBUG] Cookie parser available:', !!req.cookies);
          logger.log('[APOLLO DEBUG] Signed cookies available:', !!req.signedCookies);

          // CSRF Protection for mutations (double-submit cookie pattern)
          const requestBody = req.body;
          const isMutation = requestBody?.query?.includes('mutation');

          if (isMutation) {
            logger.log('[CSRF DEBUG] Mutation detected, checking CSRF token');
            const csrfCookie = req.cookies?.['csrf-token'];
            const csrfHeader = req.headers['x-csrf-token'];

            logger.log('[CSRF DEBUG] CSRF cookie present:', !!csrfCookie);
            logger.log('[CSRF DEBUG] CSRF header present:', !!csrfHeader);
            logger.log('[CSRF DEBUG] CSRF values match:', csrfCookie === csrfHeader);

            // Only enforce CSRF if we're using cookie-based auth
            const checkCookies = (req.signedCookies && Object.keys(req.signedCookies).length > 0) 
              ? req.signedCookies 
              : (req.cookies ?? {});
            const hasAuthCookie = !!(checkCookies[accessCookieName] || checkCookies[refreshCookieName]);

            if (hasAuthCookie) {
              logger.log('[CSRF DEBUG] Auth cookies present, enforcing CSRF protection');
              if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
                logger.error('[CSRF DEBUG] CSRF validation failed!');
                throw new Error('CSRF token validation failed');
              }
              logger.log('[CSRF DEBUG] CSRF validation passed');
            } else {
              logger.log('[CSRF DEBUG] No auth cookies, skipping CSRF check (JWT auth)');
            }
          }

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

    return 'apolloGraphqlMiddleware';
  },
};

export default loadDictElement;