# graphql-knifey

A modular, dependency-injection based toolkit for building GraphQL servers with Apollo Server. Supports both standalone and federated subgraph configurations.

## Version 5.0.0 - Breaking Changes

- 🚀 **@apollo/subgraph is now optional** - Only needed for federated subgraph servers
- 🔧 **Modular architecture** - Choose between standalone or subgraph configurations
- 🍪 **Cookie-based session authentication** with Redis storage
- 🔐 **Multiple auth strategies**: Cookie, JWT, and Hybrid modes
- 📦 **Minimal DI container** - Common dependencies without forcing unnecessary packages

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage Patterns](#usage-patterns)
  - [Standalone Server (Modular)](#1-standalone-server-modular---recommended)
  - [Federated Subgraph (Modular)](#2-federated-subgraph-modular)
  - [Legacy Patterns](#legacy-patterns)
- [Authentication](#authentication)
- [Migration from v4](#migration-from-v4-to-v5)

## Installation

```bash
npm install graphql-knifey@5.0.0

# For standalone servers (most common) - no additional dependencies needed!

# For federated subgraph servers only:
npm install @apollo/subgraph
```

## Quick Start

```typescript
import {
  diContainer,
  apolloStandaloneServerModularLDGen,
  loadSchema,
  GQLResolverDict
} from 'graphql-knifey';

// Define your GraphQL schema
const graphqlSchema = loadSchema('./src/graphql/schema/schema.graphql');

// Type-safe resolvers
const resolvers: GQLResolverDict<MyContext> = {
  Query: {
    hello: () => 'Hello World!'
  }
};

// Add Apollo server to the DI container
diContainer.addToLoadDict({
  ...apolloStandaloneServerModularLDGen(resolvers, graphqlSchema)
});

// Start the server
await diContainer.get('apolloStandaloneServerModular');
```

## Session & Cookie Authentication

graphql-knifey now includes comprehensive session management and cookie-based authentication support, making it easy to migrate from JWT tokens to secure HTTP-only cookies.

### Quick Start with Sessions

```ts
import { 
  apolloContextWithAuthLDEGen,
  sessionServiceLDEGen,
  cookieStrategyLDEGen,
  apolloStandaloneServerLDEGen
} from 'graphql-knifey';

diContainer.addToLoadDict({
  // Session service with Redis storage
  sessionService: sessionServiceLDEGen({
    sessionTTL: 7200,    // 2 hours
    refreshTTL: 604800,  // 7 days
  }),
  
  // Cookie-based authentication strategy
  authStrategy: cookieStrategyLDEGen(),
  
  // Configure authentication mode in appConfig
  appConfig: appConfigLDEGen({
    authMode: 'cookie', // 'cookie' | 'jwt' | 'hybrid'
    sessionCookieName: 'sid',
    refreshCookieName: 'rid',
  }),
  
  // Apollo context with auth support
  apolloContext: apolloContextWithAuthLDEGen({
    userService: 'userService',
    authService: 'authService',
    // any other services needed by resolvers
  }),
  
  // Apollo server (already configured for cookies)
  apolloServer: apolloStandaloneServerLDEGen(resolvers, typeDefs),
});
```

### Session Service

The `SessionService` manages server-side sessions with Redis or any compatible storage:

```ts
import { SessionService, SessionServiceInterface } from 'graphql-knifey';

interface SessionData {
  userId: string;
  metadata?: Record<string, any>;
}

// Methods available:
sessionService.create(userId, metadata)       // Returns { sessionId, refreshId }
sessionService.validate(sessionId)            // Returns SessionData or null
sessionService.refresh(refreshId)             // Returns new { sessionId, refreshId }
sessionService.revoke(sessionId)              // Revokes a session
sessionService.revokeAllUserSessions(userId)  // Revokes all user sessions
```

### Authentication Strategies

Three strategies are provided for different use cases:

#### 1. Cookie Session Strategy (Recommended)
```ts
import { cookieStrategyLDEGen } from 'graphql-knifey';

authStrategy: cookieStrategyLDEGen()
```

#### 2. JWT Strategy (Backward Compatibility)
```ts
import { jwtStrategyLDEGen } from 'graphql-knifey';

authStrategy: jwtStrategyLDEGen()
```

#### 3. Hybrid Strategy (Migration)
```ts
import { hybridStrategyLDEGen } from 'graphql-knifey';

authStrategy: hybridStrategyLDEGen(true) // true = prefer cookies
```

### Apollo Context with Auth

The enhanced Apollo context provides auth helpers in your resolvers:

```ts
// Your resolver context will include:
interface AuthContextResult {
  // Request/Response
  req: Request;
  res: Response;
  IP: string;
  
  // Auth state
  authenticated: boolean;
  userId?: string;
  user?: any;
  
  // Cookie helpers
  sessionId?: string;
  refreshId?: string;
  setAuthCookies: (args: {
    sessionId?: string;
    refreshId?: string;
    sessionMaxAgeSec?: number;
    refreshMaxAgeSec?: number;
  }) => void;
  clearAuthCookies: () => void;
  
  // Authentication configuration used
  config: {
    authStrategy?: AuthStrategy;
    sessionService?: SessionServiceInterface;
    sessionAdapter?: any;
  }
  
  // Backward compatibility
  token?: string;
  
  // Your injected services
  [key: string]: any;
}
```

### Example Resolvers

```ts
const resolvers = {
  Mutation: {
    login: async (_, { email, password }, context) => {
      const user = await context.authService.verify(email, password);
      if (!user) return { success: false };
      
      // Create session using the configured session service
      const { sessionId, refreshId } = await context.config.sessionService.create(user.id);
      
      // Set HTTP-only cookies
      context.setAuthCookies({
        sessionId,
        refreshId,
        sessionMaxAgeSec: 7200,     // 2 hours
        refreshMaxAgeSec: 604800,   // 7 days
      });
      
      return { success: true, user };
    },
    
    logout: async (_, __, context) => {
      if (context.sessionId && context.config.sessionService) {
        await context.config.sessionService.revoke(context.sessionId);
      }
      context.clearAuthCookies();
      return { success: true };
    },
    
    refreshSession: async (_, __, context) => {
      if (!context.refreshId || !context.config.sessionService) {
        return { success: false };
      }
      
      const result = await context.config.sessionService.refresh(context.refreshId);
      if (!result) return { success: false };
      
      context.setAuthCookies({
        sessionId: result.sessionId,
        refreshId: result.refreshId,
      });
      
      return { success: true };
    }
  },
  
  Query: {
    me: async (_, __, context) => {
      if (!context.authenticated) {
        throw new Error('Not authenticated');
      }
      return context.user;
    }
  }
};
```

## Architecture

### Context Creation Flow

The authentication context is created through a clean separation of concerns:

1. **Configuration** - Authentication settings (mode, cookie names) come from `appConfig`
2. **Context Factory** - `apolloContextWithAuthLDEGen` creates the context factory function
3. **Context Creation** - `createAuthContext` handles the actual authentication logic per request

```ts
import { createAuthContext, apolloContextWithAuthLDEGen } from 'graphql-knifey';

// The loader generator fetches configuration and services
apolloContext: apolloContextWithAuthLDEGen({
  // Services to inject into resolver context
  userService: 'userService',
  postService: 'postService',
})

// Behind the scenes, createAuthContext is called for each request:
// createAuthContext(params, { config, sharedContext })
```

The `createAuthContext` function:
- Extracts authentication from cookies or JWT headers
- Validates sessions or tokens
- Returns a unified context with auth state and helpers
- Handles all three auth modes: cookie, JWT, and hybrid

## Migration from JWT to Sessions

### Migration Adapter

The `SessionToJWTAdapter` helps existing JWT-based code work with sessions:

```ts
import { sessionToJWTAdapterLDEGen, authServiceAdapterLDEGen } from 'graphql-knifey';

diContainer.addToLoadDict({
  // Makes sessions work like JWTs for existing code
  sessionAdapter: sessionToJWTAdapterLDEGen(),
  
  // Wraps existing auth service to support sessions
  authServiceAdapter: authServiceAdapterLDEGen(),
  
  // Use hybrid mode during migration
  authStrategy: hybridStrategyLDEGen(true),
});
```

### Gradual Migration Path

1. **Phase 1: Add Session Support (Hybrid Mode)**
   ```ts
   authMode: 'hybrid' // Supports both JWT and cookies
   ```
   - Existing JWT clients continue working
   - New clients can use cookies
   - Both auth methods work simultaneously

2. **Phase 2: Migrate Clients**
   - Update clients to use `credentials: 'include'`
   - Remove `Authorization` header logic
   - Test with cookies

3. **Phase 3: Cookie-Only Mode**
   ```ts
   authMode: 'cookie' // Only cookies accepted
   ```
   - Remove JWT generation code
   - Simplify auth logic
   - Better security with HTTP-only cookies

### Environment Configuration

Add these to your `.env`:

```env
# Cookie Configuration
COOKIE_SECRET=your-secret-key-here
COOKIE_DOMAIN=.example.com
SESSION_COOKIE_NAME=sid
REFRESH_COOKIE_NAME=rid
SESSION_TTL=7200
REFRESH_TTL=604800
AUTH_MODE=hybrid  # cookie | jwt | hybrid
```

### App Config Updates

```ts
const appConfigGen = (env) => ({
  // ... existing config
  
  // Cookie/session configuration
  cookieSecret: env.COOKIE_SECRET,
  cookieDomain: env.COOKIE_DOMAIN,
  accessCookieName: env.SESSION_COOKIE_NAME || 'sid',
  refreshCookieName: env.REFRESH_COOKIE_NAME || 'rid',
  sessionTTL: parseInt(env.SESSION_TTL) || 7200,
  refreshTTL: parseInt(env.REFRESH_TTL) || 604800,
  authMode: env.AUTH_MODE || 'hybrid',
});
```

## Customize/Augment appConfig

```ts
import diContainer, { appConfigLDEGen, mergeToDefaultAppConfigMap } from 'graphql-knifey';
import localAppConfigMap from '../config/appConfig';

// create your injection dict
const myInjectionDict = {
  // override defaultAppConfig with a merge between defaultAppConfigMap and your localAppConfigMap
  appConfig: appConfigLDEGen(mergeToDefaultAppConfigMap(localAppConfigMap)),
  // ... rest of entries as in previous example
};

// pass it to graphql-knifey's default one
diContainer.addToLoadDict(myInjectionDict);
```

## Cookies vs Authorization Header

Cookies in a **GraphQL API** can get tricky because they involve both **server CORS setup** and **browser behavior**. Let's break it down in context of two setups (**public** vs. **subgraph**).

### 1. Why cookies are special

Unlike headers (`Authorization: Bearer ...`), cookies are automatically attached by browsers only if **three conditions** are satisfied:

1. **CORS allows credentials**
   On the server:
   ```ts
   cors({ origin: "https://app.example.com", credentials: true })
   ```

   On the client (fetch/Apollo Client):
   ```ts
   fetch("/graphql", {
     method: "POST",
     credentials: "include",   // <— critical
   });
   ```

2. **Cookie attributes** must be set properly:
   * `Secure`: required if served over HTTPS (mandatory in Chrome if `SameSite=None`).
   * `HttpOnly`: prevents JS from reading the cookie — highly recommended for session tokens.
   * `SameSite`:
     * `Lax` (default): cookie sent for top-level navigation (GET), but not for subrequests (like GraphQL fetch from a SPA).
     * `Strict`: cookie only sent if the site is the same origin — breaks cross-origin APIs.
     * `None`: cookie always sent, **but must also have `Secure`**.

3. **Domain and path** must cover your frontend.
   Example: if API is on `api.example.com` and frontend on `app.example.com`, you'd typically set:
   ```http
   Set-Cookie: session=abc123; Domain=.example.com; Path=/; SameSite=None; Secure; HttpOnly
   ```

### 2. Public Graph (browser-facing)

Here you **must configure cookies + CORS** correctly if you use them for auth:

* **Server CORS config**:
  ```ts
  app.use(
    "/graphql",
    cors({
      origin: "https://app.example.com",
      credentials: true,   // must be true for cookies
    }),
    express.json(),
    expressMiddleware(server, { context })
  );
  ```

* **Client fetch/Apollo Client config**:
  ```ts
  const client = new ApolloClient({
    uri: "https://api.example.com/graphql",
    cache: new InMemoryCache(),
    credentials: "include",   // tells browser to send cookies
  });
  ```

* **Cookie issue example**:
  If you forget `SameSite=None; Secure`, the cookie won't be sent in cross-origin requests (browser silently drops it). This is the #1 cause of "why isn't my cookie auth working?"

### 3. Subgraph (behind a gateway)

Cookies almost never matter here:

* Browsers don't talk to the subgraph directly → no CORS, no cookies.
* The **gateway** might forward headers (e.g., `Authorization`) to the subgraphs.
* If you wanted to forward cookies, the gateway would parse them into headers first.

👉 So: you **don't need cookie setup** on the subgraph at all.

### 4. Security Best Practices

* **For public graph**:
  * Use cookies only if you want true browser-based sessions (good for web apps, SSR, refresh tokens).
  * Always set `SameSite=None; Secure; HttpOnly` for cross-origin.
  * Configure CORS with `credentials: true` on both sides.
  * Use CSRF tokens for state-changing operations.
  * Implement rate limiting and session monitoring.

* **For subgraph**: ignore cookies; forward an `Authorization` header from the gateway.

* **Session Security**:
  * Use strong session IDs (UUIDs)
  * Implement session rotation on privilege escalation
  * Store minimal data in sessions
  * Set appropriate TTLs (short for sessions, longer for refresh tokens)
  * Implement proper session revocation

## TypeScript Support

All exports are fully typed. Key types include:

```ts
import type {
  SessionServiceInterface,
  SessionData,
  AuthStrategy,
  AuthResult,
  ValidationResult,
  PublicGraphContextWithAuth,
} from 'graphql-knifey';
```

## Requirements

- Node.js 18+
- Redis (for session storage)
- TypeScript 4.5+

## License

ISC