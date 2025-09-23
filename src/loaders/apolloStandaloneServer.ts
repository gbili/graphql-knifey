import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import type { GetInstanceType, LoadDictElement } from 'di-why/build/src/DiContainer';
import type { Logger } from 'saylo';
import { TypeWithoutUndefined } from '../generalTypes';

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
  secureCookies?: boolean;            // override secure cookie setting
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

const loadDictElement: LoadDictElement<GetInstanceType<typeof ApolloServer>> = {
  before: async function ({ deps }) {
    const { typeDefs, resolvers, apolloPlugins, appConfig, ...rest } = deps;
    const { nodeEnv, graphqlIntrospection } = appConfig;

    const isProd = nodeEnv === 'production';

    return {
      ...rest,
      typeDefs,
      resolvers,
      plugins: apolloPlugins,
      introspection: !isProd && Boolean(graphqlIntrospection),
      csrfPrevention: true, // browser-facing → enable
    };
  },
  constructible: ApolloServer,
  locateDeps: {
    appConfig: 'appConfig',
    typeDefs: 'typeDefs',
    resolvers: 'resolvers',
    apolloPlugins: 'apolloPlugins',
  },
  async after({ me: server, serviceLocator }) {
    const logger = await serviceLocator.get<Logger>('logger');

    // Just start the server - all middleware is handled by the modular system
    logger.log(`🚀 Starting Apollo server 🚀`);
    await server.start();
    logger.log(`✅ Apollo server started`);
  },
};

export default loadDictElement;
