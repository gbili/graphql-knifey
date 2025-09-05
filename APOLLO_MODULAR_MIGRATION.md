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
├── apolloBase.ts                    # Base Apollo Server instance
├── apolloServer.ts                  # Apollo Server configuration
├── apolloMiddlewareLoader.ts        # Orchestrates all middleware
├── apolloPlugins/
│   ├── landingPagePlugin.ts        # GraphQL Playground/Disabled
│   └── httpDrainPlugin.ts          # HTTP connection draining
└── apolloMiddlewares/
    ├── trustProxyMiddleware.ts      # Trust reverse proxies
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
const apolloLoaders: LoadDict = apolloStandaloneServerModularLDEGen(
  resolvers,
  typeDefs,
  {
    appConfig: 'appConfig',
    apolloContext: 'apolloContext',
    logger: 'logger'
  }
);

// Add to your DI container
const injectionDict: LoadDict = {
  ...apolloLoaders,
  // ... other loaders
};

// Load the fully configured server
await di.load('apolloStandaloneServerModular');
```

### Customizing Middleware Loading Order

In your appConfig:

```typescript
export default {
  // ... other config
  
  // Optional: customize middleware loading order
  apolloMiddlewaresList: [
    'apolloTrustProxyMiddleware',
    'apolloCorsMiddleware',
    'apolloCookieParserMiddleware',
    'apolloBodyParserMiddleware',
    'apolloGraphqlMiddleware',
    'apolloHealthCheckMiddleware',
    // Add your custom middleware here
    'myCustomMiddleware'
  ]
};
```

### Adding Custom Middleware

Create a new middleware loader:

```typescript
// loaders/apolloMiddlewares/myCustomMiddleware.ts
import { LoadDictElement } from 'di-why/build/src/DiContainer';
import type { Application } from '../app';

const loadDictElement: LoadDictElement<string> = {
  factory({ app, appConfig }: { app: Application; appConfig: any }) {
    const { graphqlPath } = appConfig;
    
    app.use(graphqlPath, (req, res, next) => {
      // Your custom middleware logic
      console.log('Custom middleware executed');
      next();
    });
    
    return 'myCustomMiddleware';
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
const apolloLoaders = apolloStandaloneServerModularLDEGen(resolvers, typeDefs);
Object.assign(injectionDict, apolloLoaders);
await di.load('apolloStandaloneServerModular');
```

## Testing Individual Components

Each component can now be tested in isolation:

```typescript
// Test CORS middleware independently
const corsMiddleware = await di.load('apolloCorsMiddleware');

// Test context creation separately
const graphqlMiddleware = await di.load('apolloGraphqlMiddleware');
```

## Benefits of the Modular Approach

1. **Clean Code**: Each loader has a single responsibility
2. **No process.env Access**: Configuration comes through DI
3. **Flexibility**: Easy to add, remove, or reorder middleware
4. **Debugging**: Clear understanding of middleware execution order
5. **Reusability**: Middleware can be shared across different server configurations
6. **Type Safety**: Full TypeScript support with proper typing