# graphql-knifey

Modular tooling for building Apollo Server deployments on top of the `di-why` dependency injection container. Services across the Cronide stack use it to share Express/Apollo bootstrapping, middleware orchestration, and authentication helpers (sessions + Downstream Auth Tokens).

## Highlights

- **Apollo bootstrap** – `apolloStandaloneServerModularLDGen`, `apolloSubgraphServerModularLDGen`, and `apolloGatewayServerModularLDGen` emit complete loader dictionaries for each server role.
- **Express middleware orchestration** – `createGraphqlMiddlewareConfig` plus `GRAPHQL_MIDDLEWARE` handles integrate with `express-knifey` so projects can declare per-path middleware order.
- **Session-centric auth** – `sessionServiceLDEGen`, cookie/JWT strategies, and `apolloContextWithAuthLDEGen` wire authentication state directly into resolver context.
- **Downstream Auth Tokens (DATs)** – `DATAuthMinterService` (gateways) and `DATAuthService` (subgraphs) mint/validate short-lived JWTs used between Cronide services.
- **DI-first** – every helper is a `LoadDictElement`, letting consumers merge them with their own containers using `di-why`.

## Installation

```bash
npm install graphql-knifey

# Install the peer dependencies required by your server type
npm install @apollo/server@^4
npm install @apollo/subgraph@^2   # only for federated subgraphs
npm install @apollo/gateway@^2    # only for gateways
npm install express express-knifey di-why
```

Optional peer dependencies are marked in `package.json`; install only what you need.

## Quick Start (Standalone Server)

```ts
import { mergeLDs } from 'di-why';
import DiContainer from 'di-why/build/src/DiContainer';
import { EXPRESS_MIDDLEWARE } from 'express-knifey';
import {
  loadSchema,
  apolloStandaloneServerModularLDGen,
  createGraphqlMiddlewareConfig,
  GRAPHQL_MIDDLEWARE,
  sessionServiceLDEGen,
  cookieStrategyLDEGen,
  apolloContextWithAuthLDEGen,
} from 'graphql-knifey';

const typeDefs = loadSchema('./src/graphql/schema/schema.graphql');
const resolvers = {
  Query: {
    hello: () => 'Hello world',
  },
};

const middlewareConfig = createGraphqlMiddlewareConfig({
  global: [
    EXPRESS_MIDDLEWARE.trustProxy,
    EXPRESS_MIDDLEWARE.cors,
    EXPRESS_MIDDLEWARE.cookieParser,
  ],
  graphql: [EXPRESS_MIDDLEWARE.bodyParser, GRAPHQL_MIDDLEWARE.graphql],
});

const loadDict = mergeLDs(
  apolloStandaloneServerModularLDGen({ resolvers, typeDefs, middlewareConfig }),
  {
    sessionService: sessionServiceLDEGen({ sessionTTL: 7200, refreshTTL: 604800 }),
    authStrategy: cookieStrategyLDEGen(),
    apolloContext: apolloContextWithAuthLDEGen({ userService: 'userService' }),
    // ...add project loaders (models, services, loggers, etc.)
  },
);

const di = new DiContainer({ load: loadDict });
await di.load('expressLauncher');
```

`apolloStandaloneServerModularLDGen` wires Apollo Server, Express, HTTP server, and middleware launchers. Consumers only need to merge their domain loaders and start the launcher.

## Gateways & Subgraphs

- `apolloSubgraphServerModularLDGen({ resolvers, typeDefs, middlewareConfig })`
- `apolloStandaloneServerModularLDGen({ resolvers, typeDefs, middlewareConfig })`
- `apolloGatewayServerModularLDGen({ supergraphSdl, apolloGateway, middlewareConfig })`

Gateways typically provide a custom `buildService` that returns a subclass of `RemoteGraphQLDataSource` (e.g. Cronide’s `RequestHeadersForwarder`) while the loader manages lifecycle and DI wiring.

## Authentication Utilities

### Session Service & Strategies

```ts
import { sessionServiceLDEGen, cookieStrategyLDEGen, jwtStrategyLDEGen } from 'graphql-knifey';

const sessionService = sessionServiceLDEGen({ sessionTTL: 3600, refreshTTL: 604800 });
const cookieStrategy = cookieStrategyLDEGen(); // browser sessions
const jwtStrategy = jwtStrategyLDEGen();       // bearer tokens only
```

### Apollo Context With Auth

`apolloContextWithAuthLDEGen` enriches resolver contexts with authentication state (`authenticated`, `userId`, `user`), cookie helpers, and references to the configured strategy/session service.

### Downstream Auth Tokens (DATs)

- `DATAuthMinterService` – mint DATs in gateways using session payloads.
- `DATAuthService` – validate DATs in subgraphs or standalone services.

Both are exposed as loaders (`datAuthMinterServiceLDE`, `datAuthServiceLDE`) for DI integration.

## Middleware Configuration

`createGraphqlMiddlewareConfig` accepts a path-based declaration:

```ts
import { createGraphqlMiddlewareConfig, GRAPHQL_MIDDLEWARE } from 'graphql-knifey';
import { EXPRESS_MIDDLEWARE } from 'express-knifey';

const middlewareConfig = createGraphqlMiddlewareConfig({
  global: [
    EXPRESS_MIDDLEWARE.trustProxy,
    EXPRESS_MIDDLEWARE.cors,
    EXPRESS_MIDDLEWARE.cookieParser,
  ],
  graphql: [EXPRESS_MIDDLEWARE.bodyParser, GRAPHQL_MIDDLEWARE.graphql],
  extraPaths: [
    { path: '/healthz', middleware: [EXPRESS_MIDDLEWARE.healthCheck] },
  ],
});
```

Each entry references a loader name, so custom middleware attachers can sit beside the built-ins.

## Documentation

- `APOLLO_MODULAR_MIGRATION.md` – migrating from legacy monolithic Apollo loaders.
- `IDENTITY_MAPPING.md` – explains how `(externalIssuer, externalSubject)` identities propagate through Cronide services.

## Related Packages

- [`express-knifey`](../express-knifey) – Express/HTTP DI primitives used by the middleware loaders.
- [`swissoid-back`](../swissoid-back/README.md) – reusable SwissOID backend used by Cronide services.
- [`swissoid-front`](../swissoid-front/README.md) – React helpers consuming the same auth endpoints.

---

Contributions welcome! When opening an issue or PR, include details about your DI layout and server type so we can keep the helpers composable across projects.
