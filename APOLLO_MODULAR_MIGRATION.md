# Apollo Server Modular Architecture Migration Guide

## Overview
The graphql-knifey package now supports a modular approach to Apollo Server configuration, following the same clean DI pattern used in the main application.

## Key Benefits
- **Separation of Concerns**: Each middleware and plugin is in its own loader
- **Configurable**: Middleware loading order can be customized via config
- **Testable**: Individual components can be tested in isolation
- **Maintainable**: Clear single responsibility for each loader
- **Extensible**: Easy to add new middleware or plugins

## Architecture

### Before (Monolithic)
```
apolloStandaloneServer.ts
├── Apollo Server configuration
├── Express middleware setup
├── CORS configuration
├── Cookie parsing
├── CSRF protection
├── Context creation
└── Server startup
```

### After (Modular)
```
loaders/
├── apolloStandaloneServer.ts        # Standalone Apollo Server instance
├── apolloSubgraphServer.ts          # Subgraph Apollo Server instance
├── expressLauncher.ts               # Orchestrates middleware & starts server
├── httpServer.ts                    # HTTP server wrapper for Express
├── app.ts                          # Express application instance
├── apolloPlugins/
│   ├── landingPagePlugin.ts        # GraphQL Playground/Disabled
│   └── httpDrainPlugin.ts          # HTTP connection draining
└── expressMiddlewares/              # Generic Express middlewares
    ├── trustProxyMiddleware.ts      # Trust reverse proxies (global)
    ├── corsMiddleware.ts            # CORS configuration
    ├── cookieParserMiddleware.ts    # Cookie parsing
    ├── bodyParserMiddleware.ts      # JSON body parsing
    ├── graphqlMiddleware.ts         # Apollo Express middleware
    └── healthCheckMiddleware.ts     # Health check endpoint
```

## Usage

### Using the New Modular Approach

```typescript
import { apolloStandaloneServerModularLDEGen } from 'graphql-knifey';
import gql from 'graphql-tag';
import { LoadDict } from 'di-why/build/src/DiContainer';

const typeDefs = gql`
  type Query {
    hello: String
  }
`;

const resolvers = {
  Query: {
    hello: () => 'World'
  }
};

// Generate the LoadDict with all necessary loaders
const apolloLoaders: LoadDict = apolloStandaloneServerModularLDGen(
  resolvers,
  typeDefs,
  // Optional: custom loader handles (defaults to standard ones)
  customLoaderHandles,
  // Optional: custom middleware configuration
  middlewareConfig
);

// Add to your DI container
const injectionDict: LoadDict = {
  ...apolloLoaders,
  // ... other loaders
};

// Load the fully configured server
await di.load('apolloServer');
```

### Customizing Middleware Configuration

The new architecture uses a path-based middleware configuration with priorities:

```typescript
import { MiddlewarePathConfig } from 'graphql-knifey';

const middlewareConfig: MiddlewarePathConfig = {
  '/graphql': [
    { name: 'expressTrustProxyMiddleware', priority: 100 },  // Highest priority
    { name: 'expressCorsMiddleware', priority: 90 },
    { name: 'expressCookieParserMiddleware', priority: 80 },
    { name: 'expressBodyParserMiddleware', priority: 70 },
    { name: 'expressGraphqlMiddleware', required: true, priority: -100 }, // Always last
    // Add your custom middleware here
    { name: 'myCustomMiddleware', priority: 60 }
  ],
  '/healthz': [
    { name: 'expressHealthCheckMiddleware', priority: 0 }
  ],
  '/metrics': [
    { name: 'myMetricsMiddleware', priority: 0 }
  ]
};

// Pass to the loader generator
const apolloLoaders = apolloStandaloneServerModularLDGen(
  resolvers,
  typeDefs,
  undefined, // use default loader handles
  middlewareConfig
);
```

### Adding Custom Middleware

Middlewares now return functions that accept a path parameter:

```typescript
// loaders/expressMiddlewares/myCustomMiddleware.ts
import { LoadDictElement } from 'di-why/build/src/DiContainer';
import type { Application } from '../app';
import { MiddlewareAttacher } from 'graphql-knifey';

const loadDictElement: LoadDictElement<MiddlewareAttacher> = {
  factory({ app, appConfig }: { app: Application; appConfig: any }) {
    // Return a function that attaches the middleware when called
    return (path: string) => {
      app.use(path, (req, res, next) => {
        // Your custom middleware logic
        console.log(`Custom middleware executed on ${path}`);
        next();
      });
    };
  },
  locateDeps: {
    app: 'app',
    appConfig: 'appConfig'
  }
};

export default loadDictElement;
```

Then add it to your injection dict:

```typescript
import myCustomMiddleware from './loaders/apolloMiddlewares/myCustomMiddleware';

const injectionDict: LoadDict = {
  // ... other loaders
  myCustomMiddleware,
};
```

## Migration from apolloStandaloneServerLDEGen

The original `apolloStandaloneServerLDEGen` is still available for backward compatibility. To migrate:

1. Replace `apolloStandaloneServerLDEGen` with `apolloStandaloneServerModularLDEGen`
2. The API is identical - same parameters and usage
3. Add the returned LoadDict to your injection dict
4. Load `apolloStandaloneServerModular` instead of the previous loader name

### Before
```typescript
const apolloServerLoader = apolloStandaloneServerLDEGen(resolvers, typeDefs);
injectionDict['apolloServer'] = apolloServerLoader;
await di.load('apolloServer');
```

### After
```typescript
const apolloLoaders = apolloStandaloneServerModularLDGen(resolvers, typeDefs);
Object.assign(injectionDict, apolloLoaders);
await di.load('apolloServer');  // Note: loads through expressLauncher
```

## Testing Individual Components

Each component can now be tested in isolation:

```typescript
// Test CORS middleware independently
const corsMiddleware = await di.load('expressCorsMiddleware');
corsMiddleware('/api');  // Attach to a path

// Test context creation separately
const graphqlMiddleware = await di.load('expressGraphqlMiddleware');
graphqlMiddleware('/graphql');  // Attach to GraphQL path
```

## Benefits of the Modular Approach

1. **Clean Code**: Each loader has a single responsibility
2. **No process.env Access**: Configuration comes through DI
3. **Path-based Configuration**: Middlewares can be attached to different paths
4. **Priority System**: Explicit control over middleware loading order
5. **Required vs Optional**: Mark critical middlewares as required
6. **Reusability**: Middleware functions can be attached to multiple paths
7. **Type Safety**: Full TypeScript support with proper typing

## Key Architecture Changes

### Middleware as Functions
Middlewares now return `MiddlewareAttacher` functions that accept a path:
- Allows attaching the same middleware to multiple paths
- Clear separation between middleware creation and attachment
- More flexible than hardcoded paths

### Express Launcher
The `expressLauncher` orchestrates the entire server setup:
1. Loads middlewares based on configuration
2. Sorts by priority (higher priority loads first)
3. Attaches each to its configured path
4. Starts the HTTP server
5. Provides appropriate logging

### Separation of Concerns
- `httpServer`: Just creates the HTTP server
- `expressLauncher`: Orchestrates and starts everything
- `expressGraphqlMiddleware`: Handles Apollo-specific setup
- Other middlewares: Focus on their specific functionality