import { isMeantToBeTrue, envHasKeyGen, getTypedKey, UnknownEnv } from "swiss-army-knifey";

const appConfigMap = function (env: UnknownEnv & {
  APP_PORT?: string;
  APPLICATION_NAME?: string;
  CORS_ALLOWED_ORIGIN?: string;
  CORS_CREDENTIALS?: string;
  COOKIE_SECRET?: string;
  COOKIE_DOMAIN?: string;
  GRAPHQL_INTROSPECTION?: string;
  GRAPHQL_PLAYGROUND?: string;
  GRAPHQL_PUBLIC_PATH?: string;
  NODE_ENV?: string;
  GRAPHQL_AUTH_MODE?: string;
  SESSION_COOKIE_NAME?: string;
  REFRESH_COOKIE_NAME?: string;
  APOLLO_MIDDLEWARES_LIST?: string;
  JWT_ISSUER?: string;
  JWT_AUDIENCE?: string;
  JWT_KEY_PRIVATE?: string;
  DAT_TTL?: string;
}) {
  // JWT configuration - only used by datAuthServiceLDE/datServiceLDE, so make optional
  const pubKeyInEnv = 'JWT_KEY_PUBLIC';
  if (env[pubKeyInEnv]) {
    env[pubKeyInEnv] = getTypedKey(env, pubKeyInEnv);
  }
  const privKeyInEnv = 'JWT_KEY_PRIVATE';
  if (env[privKeyInEnv]) {
    env[privKeyInEnv] = getTypedKey(env, privKeyInEnv);
  }
  const hasKey = envHasKeyGen(env);

  if (!hasKey('JWT_ALGORITHM')) {
    env['JWT_ALGORITHM'] = 'RS256';
  }

  // Logger defaults
  if (!hasKey('LOGGER_LOG')) {
    env['LOGGER_LOG'] = '0';
  }
  if (!hasKey('LOGGER_DEBUG')) {
    env['LOGGER_DEBUG'] = '1';
  }

  if (undefined === env.APPLICATION_NAME) {
    throw new Error('Missing .env var APPLICATION_NAME, ex: "My App" used as brand name in email verification');
  }
  if (undefined === env.GRAPHQL_INTROSPECTION) {
    throw new Error('Missing .env var GRAPHQL_INTROSPECTION, is required to determine graphql playground availability');
  }
  if (undefined === env.GRAPHQL_PLAYGROUND) {
    throw new Error('Missing .env var GRAPHQL_PLAYGROUND, is required to determine graphql playground availability');
  }
  if (undefined === env.NODE_ENV) {
    throw new Error('Missing .env var NODE_ENV, is required to determine graphql playground availability');
  }

  return {
    applicationName: env.APPLICATION_NAME,
    corsAllowedOrigin: env.CORS_ALLOWED_ORIGIN || null,
    corsCredentials: isMeantToBeTrue(env.CORS_CREDENTIALS), // default true
    cookieSecret: env.COOKIE_SECRET,
    cookieDomain: env.COOKIE_DOMAIN,
    graphqlIntrospection: !!env.GRAPHQL_INTROSPECTION,
    graphqlPath: env.GRAPHQL_PUBLIC_PATH || '/graphql',
    graphqlPlayground: !!env.GRAPHQL_PLAYGROUND,
    nodeEnv: env.NODE_ENV || 'development',
    serverPort: (env.APP_PORT !== undefined && parseInt(env.APP_PORT)) || 3500,
    authMode: env.GRAPHQL_AUTH_MODE || 'cookie',
    // Cookie names - using accessCookieName/refreshCookieName for consistency with usage
    accessCookieName: env.SESSION_COOKIE_NAME || 'sid',
    refreshCookieName: env.REFRESH_COOKIE_NAME || 'rid',
    // Also keep old names for backward compatibility
    sessionCookieName: env.SESSION_COOKIE_NAME || 'sid',
    // Optional middleware list (comma-separated)
    apolloMiddlewaresList: env.APOLLO_MIDDLEWARES_LIST
      ? env.APOLLO_MIDDLEWARES_LIST.split(',').map(s => s.trim())
      : undefined,
    // Include the processed env values for JWT and logging
    // These are optional - only needed if using datAuthServiceLDE/datServiceLDE
    jwtKeyPublic: env.JWT_KEY_PUBLIC || undefined,
    jwtKeyPrivate: env.JWT_KEY_PRIVATE || undefined,
    jwtAlgorithm: env.JWT_ALGORITHM || undefined,
    jwtIssuer: env.JWT_ISSUER || undefined,
    jwtAudience: env.JWT_AUDIENCE || undefined,
    datTtl: env.DAT_TTL ? parseInt(env.DAT_TTL) : 180, // Default 3 minutes
    loggerLog: env.LOGGER_LOG,
    loggerDebug: env.LOGGER_DEBUG,
  };
}

export default appConfigMap;

export type GKAppConfigMap = typeof appConfigMap;