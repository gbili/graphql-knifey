import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerPluginLandingPageGraphQLPlayground } from '@apollo/server-plugin-landing-page-graphql-playground';
import type { GetInstanceType, LoadDictElement } from 'di-why/build/src/DiContainer';
import type { Logger } from 'saylo';
import gql from 'graphql-tag';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import type { Request, Response } from 'express';
import { Application } from '../../loaders/app';
import { HttpServer } from '../../loaders/httpServer';
import { TypeWithoutUndefined } from '../../generalTypes';
import { makeCookieHelpers } from '../cookieHelper';

// --- Types ----------------------------------------------------------

export type Resolvers<Context> = TypeWithoutUndefined<Record<string, any>>;

export type ApolloServerConfigParams = {
  // Public graph → CORS required
  corsAllowedOrigin: string | RegExp | (string | RegExp)[];
  corsCredentials?: boolean;          // default true for cookies
  cookieSecret?: string;              // for signed cookies (recommended)
  cookieDomain?: string;              // e.g. ".example.com"
  nodeEnv: string;                    // 'production' | 'development' | etc.
  graphqlPlayground: boolean;         // enable playground in dev only
  graphqlIntrospection: boolean;      // enable introspection in dev only
  serverPort: number;
  graphqlPath: string;                // e.g. '/graphql'
  applicationName: string;
  // Cookie names (override if you like)
  accessCookieName?: string;          // default 'sid'
  refreshCookieName?: string;         // default 'rid'
};

export type LocatorHandles = { appConfig: string; apolloContext: string; logger: string; };

// What your resolvers get in context:
export type PublicGraphContext = {
  req: Request;
  res: Response;
  sessionId?: string | null;
  refreshId?: string | null;
  // Helpers your resolvers can call:
  setAuthCookies: (args: {
    sessionId?: string | null;
    refreshId?: string | null;
    // Optional per-set overrides
    sessionMaxAgeSec?: number;
    refreshMaxAgeSec?: number;
  }) => void;
  clearAuthCookies: () => void;
  // plus anything your app adds via apolloContext DI (merged in)
  [k: string]: any;
};

// --- Loader ---------------------------------------------------------

function loadDictElementGen(
  resolvers: Resolvers<any>,
  typeDefs: ReturnType<typeof gql>,
  {
    appConfig: appConfigHandle,
    apolloContext: apolloContextHandle,
    logger: loggerHandle,
  }: LocatorHandles = {
    appConfig: 'appConfig',
    apolloContext: 'apolloContext',
    logger: 'logger',
  }
) {
  const loadDictElement: LoadDictElement<GetInstanceType<typeof ApolloServer>> = {
    before: async function ({ deps, serviceLocator }) {
      const { nodeEnv, graphqlIntrospection, graphqlPlayground } =
        await serviceLocator.get<ApolloServerConfigParams>(appConfigHandle);
      const { httpDrainApolloPlugin, ...rest } = deps;

      const isProd = nodeEnv === 'production';

      return {
        ...rest,
        typeDefs,
        resolvers,
        plugins: [
          !isProd && graphqlPlayground
            ? ApolloServerPluginLandingPageGraphQLPlayground()
            : ApolloServerPluginLandingPageDisabled(),
          httpDrainApolloPlugin,
        ],
        introspection: !isProd && Boolean(graphqlIntrospection),
        csrfPrevention: true, // browser-facing → enable
      };
    },
    constructible: ApolloServer,
    deps: {},
    locateDeps: {
      httpDrainApolloPlugin: 'httpDrainApolloPlugin',
    },
    async after({ me: server, serviceLocator }) {
      const rawAppContext = await serviceLocator.get(apolloContextHandle); // you may merge this into final context
      const logger = await serviceLocator.get<Logger>(loggerHandle);
      const app = await serviceLocator.get<Application>('app');
      const httpServer = await serviceLocator.get<HttpServer>('httpServer');

      const {
        serverPort,
        graphqlPath,
        applicationName,
        corsAllowedOrigin,
        corsCredentials = true,
        cookieSecret,
        cookieDomain,
        nodeEnv,
        accessCookieName = 'sid',
        refreshCookieName = 'rid',
      } = await serviceLocator.get<ApolloServerConfigParams>(appConfigHandle);

      const isProd = nodeEnv === 'production';

      try {
        logger.log(`🚀 Starting Apollo (public graph w/ cookies) 🚀`);
        logger.log(`[APOLLO DEBUG] Cookie configuration:`);
        logger.log(`[APOLLO DEBUG] - Cookie secret: ${cookieSecret ? 'SET' : 'NOT SET'}`);
        logger.log(`[APOLLO DEBUG] - Cookie domain: ${cookieDomain || 'NOT SET (will use current domain)'}`);
        logger.log(`[APOLLO DEBUG] - Session cookie name: ${accessCookieName}`);
        logger.log(`[APOLLO DEBUG] - Refresh cookie name: ${refreshCookieName}`);
        logger.log(`[APOLLO DEBUG] - CORS credentials: ${corsCredentials}`);
        logger.log(`[APOLLO DEBUG] - CORS origin: ${JSON.stringify(corsAllowedOrigin)}`);
        logger.log(`[APOLLO DEBUG] - Environment: ${nodeEnv}`);

        await server.start();
        logger.log(`🚀 Started Apollo 🚀`);

        // Trust reverse proxies (so secure cookies & proto work correctly behind TLS terminators)
        app.set('trust proxy', 1);

        // CORS: allow credentials so browser sends cookies
        app.use(
          graphqlPath,
          cors({
            origin: corsAllowedOrigin,
            credentials: Boolean(corsCredentials),
            methods: ['GET', 'POST', 'OPTIONS'],
            allowedHeaders: [
              'Content-Type',
              'Authorization',
              'Apollo-Require-Preflight',
              'X-Requested-With',
              'X-CSRF-Token',  // Allow CSRF token header
            ],
            maxAge: 86400,
          }),
          // Parse cookies (signed if secret is provided)
          cookieSecret ? cookieParser(cookieSecret) : cookieParser(),
          express.json({ limit: '50mb' }),
          expressMiddleware(server, {
            // IMPORTANT: pass req & res to context so resolvers can set/clear cookies
            context: async ({ req, res }): Promise<PublicGraphContext> => {
              console.log('[APOLLO DEBUG] Context creation started');

              console.log('[APOLLO DEBUG] Cookie parser available:', !!req.cookies);
              console.log('[APOLLO DEBUG] Signed cookies available:', !!req.signedCookies);

              // CSRF Protection for mutations (double-submit cookie pattern)
              const requestBody = req.body;
              const isMutation = requestBody?.query?.includes('mutation');

              if (isMutation) {
                console.log('[CSRF DEBUG] Mutation detected, checking CSRF token');
                const csrfCookie = req.cookies?.['csrf-token'];
                const csrfHeader = req.headers['x-csrf-token'];

                console.log('[CSRF DEBUG] CSRF cookie present:', !!csrfCookie);
                console.log('[CSRF DEBUG] CSRF header present:', !!csrfHeader);
                console.log('[CSRF DEBUG] CSRF values match:', csrfCookie === csrfHeader);

                // Only enforce CSRF if we're using cookie-based auth
                const cookies = req.signedCookies ?? req.cookies ?? {};
                const hasAuthCookie = !!(cookies[accessCookieName] || cookies[refreshCookieName]);

                if (hasAuthCookie) {
                  console.log('[CSRF DEBUG] Auth cookies present, enforcing CSRF protection');
                  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
                    console.error('[CSRF DEBUG] CSRF validation failed!');
                    throw new Error('CSRF token validation failed');
                  }
                  console.log('[CSRF DEBUG] CSRF validation passed');
                } else {
                  console.log('[CSRF DEBUG] No auth cookies, skipping CSRF check (JWT auth)');
                }
              }

              // Prefer signed cookies if cookieSecret is set
              const cookies = req.signedCookies ?? req.cookies ?? {};
              console.log('[APOLLO DEBUG] All cookies:', cookies);
              console.log('[APOLLO DEBUG] Looking for cookies - access:', accessCookieName, 'refresh:', refreshCookieName);

              const sessionId = cookies[accessCookieName] ?? null;
              const refreshId = cookies[refreshCookieName] ?? null;
              console.log('[APOLLO DEBUG] Found sessionId:', !!sessionId);
              console.log('[APOLLO DEBUG] Found refreshId:', !!refreshId);

              const { setAuthCookies, clearAuthCookies } = makeCookieHelpers(res, {
                isProd,
                domain: cookieDomain,
                accessName: accessCookieName,
                refreshName: refreshCookieName,
              });
              console.log('[APOLLO DEBUG] Cookie helpers created');
              console.log('[APOLLO DEBUG] Cookie domain:', cookieDomain);
              console.log('[APOLLO DEBUG] Is production:', isProd);

              // Merge any additional context your DI provides
              const extra = typeof rawAppContext === 'function'
                ? await rawAppContext({ req, res, sessionId, refreshId, setAuthCookies, clearAuthCookies })
                : rawAppContext;
              console.log('[APOLLO DEBUG] Extra context type:', typeof rawAppContext);
              console.log('[APOLLO DEBUG] Extra context keys:', extra ? Object.keys(extra) : 'none');

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
          }),
        );

        app.get('/healthz', (_req, res) => res.status(200).send('ok'));

        logger.log(`🚀 Launching "${applicationName}" 🚀`);
        await new Promise<void>((resolve) =>
          httpServer.listen({ port: serverPort }, resolve)
        );

        logger.log(
          `✅ Public Graph running at http://localhost:${serverPort}${graphqlPath}`
        );
      } catch (err) {
        logger.error('Error starting server', err);
      }
    },
  };

  return loadDictElement;
}

export default loadDictElementGen;
