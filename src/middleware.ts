import {
  EXPRESS_MIDDLEWARE,
  buildMiddlewareConfig,
  defineMiddleware,
  type MiddlewareHandle,
  type MiddlewarePathConfig,
} from 'express-knifey';

/**
 * Handles for GraphQL-specific middleware provided by graphql-knifey.
 */
export const GRAPHQL_MIDDLEWARE = {
  graphql: defineMiddleware({
    name: 'expressGraphqlMiddleware',
    defaultPriority: -100,
    defaultPath: '/graphql',
    required: true,
  }),
} as const;

export type GraphqlMiddlewareHandle = typeof GRAPHQL_MIDDLEWARE[keyof typeof GRAPHQL_MIDDLEWARE];

type ExtraPath = {
  path: string | '*';
  middleware: MiddlewareHandle[];
};

export type GraphqlMiddlewareConfigOptions = {
  /**
   * Middlewares applied to every route (e.g., auth guards).
   */
  global?: MiddlewareHandle[];
  /**
   * Override the default GraphQL path.
   */
  graphqlPath?: string;
  /**
   * Middlewares for the GraphQL endpoint, appended after defaults.
   */
  graphql?: MiddlewareHandle[];
  /**
   * Override the health-check path.
   */
  healthPath?: string;
  /**
   * Middlewares for the health endpoint.
   */
  health?: MiddlewareHandle[];
  /**
   * Additional custom paths.
   */
  extraPaths?: ExtraPath[];
};

const DEFAULT_GRAPHQL_MIDDLEWARE_SEQUENCE: MiddlewareHandle[] = [
  EXPRESS_MIDDLEWARE.trustProxy,
  EXPRESS_MIDDLEWARE.cors,
  EXPRESS_MIDDLEWARE.cookieParser,
  EXPRESS_MIDDLEWARE.bodyParser,
  GRAPHQL_MIDDLEWARE.graphql,
];

const DEFAULT_HEALTH_SEQUENCE: MiddlewareHandle[] = [
  EXPRESS_MIDDLEWARE.healthCheck,
];

const DEFAULT_GRAPHQL_PATH = GRAPHQL_MIDDLEWARE.graphql.defaultPath ?? '/graphql';
const DEFAULT_HEALTH_PATH = EXPRESS_MIDDLEWARE.healthCheck.defaultPath ?? '/healthz';

export const createGraphqlMiddlewareConfig = (
  options: GraphqlMiddlewareConfigOptions = {}
): MiddlewarePathConfig => {
  const {
    global = [],
    graphqlPath = DEFAULT_GRAPHQL_PATH,
    graphql = [],
    healthPath = DEFAULT_HEALTH_PATH,
    health = [],
    extraPaths = [],
  } = options;

  const paths: ExtraPath[] = [];

  if (global.length) {
    paths.push({ path: '*', middleware: global });
  }

  paths.push({
    path: graphqlPath,
    middleware: [...DEFAULT_GRAPHQL_MIDDLEWARE_SEQUENCE, ...graphql],
  });

  paths.push({
    path: healthPath,
    middleware: [...DEFAULT_HEALTH_SEQUENCE, ...health],
  });

  paths.push(...extraPaths);

  return buildMiddlewareConfig(paths);
};

export const graphqlMiddlewareHandle = GRAPHQL_MIDDLEWARE.graphql.name;

export type { MiddlewareHandle } from 'express-knifey';
