# Phase 2: Test Backend in biblio-stats-graphql

## Objective
Validate that the authentication modules extracted in Phase 1 work correctly in a standalone GraphQL service (biblio-stats-graphql), proving they are truly reusable across different projects.

## Prerequisites
- Phase 1 completed: Auth modules extracted to swissoid-back package
- swissoid-back published/linked for use in biblio-stats-graphql
- SwissOID client configured for biblio-stats (registering biblio-stats as a new application/client in the SwissOID identity provider system, already done)

## Current State of biblio-stats-graphql

### What It Has Now
```typescript
// biblio-stats-graphql/src/loaders/index.ts
{
  apolloContext: apolloContextLDEGen({
    statService: 'statService',
    userService: 'userService',
    tokenAuthService: 'tokenAuthService', // Stub implementation
    coreToDomain: 'coreToDomain',
  }),
  tokenAuthService, // Currently returns null
  // No OIDC routes
  // No session management
  // No cookie handling
}
```

### What It Needs
1. OIDC authentication flow
2. Session management
3. Cookie-based authentication
4. Protected GraphQL endpoints

## Implementation Plan

### Step 1: Add Dependencies

```bash
# In biblio-stats-graphql
npm install swissoid-back@latest  # Or use npm link for local development
npm install graphql-knifey@latest  # For base GraphQL utilities
npm install redis ioredis
npm install cookie-parser
npm install express-session
```

### Step 2: Configure SwissOID for biblio-stats

**Register with SwissOID:**
- Client ID: `biblio-stats`
- Redirect URI: `https://biblio-stats.example.com/oidc/callback`
- Response Type: `code`
- Response Mode: `form_post`

**Environment Configuration:**
```bash
# .env.local
# SwissOID Configuration
SWISSOID_ISSUER=https://api.swissoid.com
SWISSOID_CLIENT_ID=biblio-stats
SWISSOID_CLIENT_SECRET=<obtain-from-swissoid>
SWISSOID_TOKEN_ENDPOINT=https://api.swissoid.com/token
SWISSOID_JWKS_URI=https://api.swissoid.com/.well-known/jwks.json
SWISSOID_AUTHORIZE_ENDPOINT=https://api.swissoid.com/authorize

# Biblio-stats Configuration
BASE_URL=https://biblio-stats.example.com
RP_CALLBACK_URL=https://biblio-stats.example.com/oidc/callback
RP_COOKIE_DOMAIN=.biblio-stats.example.com
RP_FRONTEND_URL=https://app.biblio-stats.example.com

# Session Configuration
SESSION_COOKIE_NAME=biblio_session
REFRESH_COOKIE_NAME=biblio_refresh
SESSION_SECRET=<generate-strong-secret>
STATE_SIGNING_SECRET=<generate-strong-secret>

# Redis (for sessions)
REDIS_URL=redis://localhost:6379
```

### Step 3: Update biblio-stats-graphql Loaders

```typescript
// biblio-stats-graphql/src/loaders/index.ts
import {
  oidcRoutesLDEGen,
  swissoidSessionServiceLDEGen,
  cookieManagerLDEGen,
  swissoidJWTVerifierLDEGen
} from 'swissoid-back';
import {
  apolloContextLDEGen,
  apolloStandaloneServerModularLDGen
} from 'graphql-knifey';
import { mysqlReqLoader, mysqlMultipleReqLoader } from "mysql-oh-wait-utils";
import DiContainer from 'di-why';

import statModel from './statsModel';
import statService from './statsService';
import userModel from './userModel';
import userService from './userService';
import coreToDomain from './coreToDomain';
import logger from './logger';
import redisClient from './redisClient'; // New: Redis for sessions
import resolvers from '../graphql/resolvers';
import graphqlSchema from '../graphql/schema';
import localAppConfigMap from '../config/appConfig';

const diContainer = new DiContainer({
  load: {
    appConfigMap: { instance: localAppConfigMap },

    // Database
    mysqlReq,
    mysqlMultipleReq,

    // NEW: Authentication modules from swissoid-back
    oidcRoutes: oidcRoutesLDEGen({
      clientId: 'biblio-stats',
      cookieDomain: '.biblio-stats.example.com'
    }),
    sessionService: swissoidSessionServiceLDEGen({
      sessionTTL: 7200,  // 2 hours
      refreshTTL: 604800, // 7 days
      cookieName: 'biblio_session'
    }),
    cookieManager: cookieManagerLDEGen({
      sessionName: 'biblio_session',
      refreshName: 'biblio_refresh'
    }),
    jwtVerifier: swissoidJWTVerifierLDEGen(),
    redisClient, // New loader

    // Apollo Context with Authentication
    apolloContext: apolloContextLDEGen({
      statService: 'statService',
      userService: 'userService',
      sessionService: 'sessionService', // Now using real session service
      cookieManager: 'cookieManager',
      coreToDomain: 'coreToDomain',
    }),

    // Business logic
    logger,
    statModel,
    statService,
    coreToDomain,
    userModel,
    userService,

    // Apollo Server with auth middleware
    ...apolloStandaloneServerModularLDGen({
      resolvers: resolvers,
      typeDefs: graphqlSchema,
      middleware: {
        // Cookie parser must run before OIDC routes
        cookieParser: { priority: 195 },
        oidcRoutes: { priority: 150 },
        authExtraction: { priority: 140 }
      }
    }),
  }
});

export default diContainer;
```

### Step 4: Create Redis Client Loader

```typescript
// biblio-stats-graphql/src/loaders/redisClient.ts
import { LoadDictElement } from 'di-why/build/src/DiContainer';
import Redis from 'ioredis';

const loadDictElement: LoadDictElement<Redis> = {
  factory: ({ appConfig, logger }) => {
    const redis = new Redis(appConfig.redisUrl || 'redis://localhost:6379', {
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 2000);
      }
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    return redis;
  },
  locateDeps: {
    appConfig: 'appConfig',
    logger: 'logger'
  }
};

export default loadDictElement;
```

### Step 5: Update GraphQL Resolvers for Auth

```typescript
// biblio-stats-graphql/src/graphql/resolvers/stats.ts

const resolvers = {
  Query: {
    // Public query (no auth required)
    getPublicStats: async (_, __, context) => {
      return await context.statService.getPublicStats();
    },

    // Protected query (requires authentication)
    getUserStats: async (_, { input }, context) => {
      // Check authentication from context (set by apolloContextLDEGen)
      if (!context.authenticated) {
        throw new Error('Authentication required');
      }

      return await context.statService.getUserStats({
        userId: context.userId,
        ...input
      });
    },

    // Admin query (requires specific role)
    getAllStats: async (_, __, context) => {
      if (!context.authenticated || !context.user?.roles?.includes('admin')) {
        throw new Error('Admin access required');
      }

      return await context.statService.getAllStats();
    }
  },

  Mutation: {
    // Protected mutation
    updateUserStats: async (_, { input }, context) => {
      if (!context.authenticated) {
        throw new Error('Authentication required');
      }

      return await context.statService.updateUserStats({
        userId: context.userId,
        ...input
      });
    }
  }
};
```

### Step 6: Update App Configuration

```typescript
// biblio-stats-graphql/src/config/appConfig.ts
export default {
  // SwissOID Configuration
  swissoidIssuer: process.env.SWISSOID_ISSUER,
  swissoidClientId: process.env.SWISSOID_CLIENT_ID,
  swissoidClientSecret: process.env.SWISSOID_CLIENT_SECRET,
  swissoidTokenEndpoint: process.env.SWISSOID_TOKEN_ENDPOINT,
  swissoidJwksUri: process.env.SWISSOID_JWKS_URI,
  swissoidAuthorizeEndpoint: process.env.SWISSOID_AUTHORIZE_ENDPOINT,

  // RP Configuration
  baseUrl: process.env.BASE_URL,
  rpCallbackUrl: process.env.RP_CALLBACK_URL,
  rpCookieDomain: process.env.RP_COOKIE_DOMAIN,
  rpFrontendUrl: process.env.RP_FRONTEND_URL,

  // Session Configuration
  sessionCookieName: process.env.SESSION_COOKIE_NAME,
  refreshCookieName: process.env.REFRESH_COOKIE_NAME,
  sessionSecret: process.env.SESSION_SECRET,
  stateSigningSecret: process.env.STATE_SIGNING_SECRET,

  // Redis
  redisUrl: process.env.REDIS_URL,

  // Existing config
  mysqlConn: {
    // ... existing database config
  }
};
```

### Step 7: Test Authentication Flow

#### 7.1 Manual Testing Checklist

- [ ] **Login Flow**
  ```bash
  # Navigate to
  https://biblio-stats.example.com/login
  # Should redirect to SwissOID
  # After login, should redirect back to callback
  # Should set cookies: biblio_session, biblio_refresh
  ```

- [ ] **Auth Status Check**
  ```bash
  curl https://biblio-stats.example.com/auth/status \
    -H "Cookie: biblio_session=<session-id>"

  # Should return:
  # { "authenticated": true, "user": { ... } }
  ```

- [ ] **GraphQL Protected Query**
  ```bash
  curl https://biblio-stats.example.com/graphql \
    -H "Content-Type: application/json" \
    -H "Cookie: biblio_session=<session-id>" \
    -d '{"query": "{ getUserStats { ... } }"}'

  # Should return user-specific stats
  ```

- [ ] **Logout**
  ```bash
  curl -X POST https://biblio-stats.example.com/auth/logout \
    -H "Cookie: biblio_session=<session-id>"

  # Should clear cookies
  ```

#### 7.2 Integration Tests

```typescript
// biblio-stats-graphql/test/auth.integration.test.ts
describe('Authentication Integration', () => {
  it('should complete OIDC login flow', async () => {
    // 1. Initiate login
    const loginResponse = await request(app)
      .get('/login')
      .expect(302);

    // Should redirect to SwissOID
    expect(loginResponse.headers.location).toContain('swissoid.com/authorize');
  });

  it('should validate session', async () => {
    // Create test session
    const { sessionId } = await sessionService.create('test-user-id', {
      email: 'test@example.com'
    });

    // Check auth status
    const response = await request(app)
      .get('/auth/status')
      .set('Cookie', `biblio_session=${sessionId}`)
      .expect(200);

    expect(response.body).toMatchObject({
      authenticated: true,
      user: {
        id: 'test-user-id',
        email: 'test@example.com'
      }
    });
  });

  it('should protect GraphQL queries', async () => {
    // Without session - should fail
    const noAuthResponse = await request(app)
      .post('/graphql')
      .send({
        query: '{ getUserStats { count } }'
      })
      .expect(200);

    expect(noAuthResponse.body.errors).toBeDefined();
    expect(noAuthResponse.body.errors[0].message).toContain('Authentication required');

    // With session - should succeed
    const { sessionId } = await sessionService.create('test-user-id');

    const authResponse = await request(app)
      .post('/graphql')
      .set('Cookie', `biblio_session=${sessionId}`)
      .send({
        query: '{ getUserStats { count } }'
      })
      .expect(200);

    expect(authResponse.body.data.getUserStats).toBeDefined();
  });
});
```

### Step 8: Troubleshooting Guide

#### Common Issues and Solutions

1. **Redis Connection Fails**
   ```bash
   # Check Redis is running
   redis-cli ping

   # If not, start Redis
   docker run -d -p 6379:6379 redis:alpine
   ```

2. **SwissOID Redirect Mismatch**
   - Verify redirect_uri in SwissOID configuration
   - Ensure BASE_URL matches registered redirect_uri

3. **Cookies Not Setting**
   - Check RP_COOKIE_DOMAIN matches your domain
   - Verify HTTPS is enabled (cookies are Secure)
   - Check SameSite settings

4. **Session Not Found**
   - Verify Redis has the session key
   ```bash
   redis-cli KEYS "session:*"
   ```
   - Check session TTL hasn't expired

5. **GraphQL Context Missing Auth**
   - Ensure apolloContextLDEGen is used with auth modules
   - Verify sessionService is properly injected
   - Check middleware execution order

## Validation Criteria

### Required Functionality
- [ ] Users can initiate login via `/login`
- [ ] SwissOID redirects back to `/oidc/callback`
- [ ] Session is created and cookies are set
- [ ] `/auth/status` returns correct authentication state
- [ ] Protected GraphQL queries require authentication
- [ ] Public GraphQL queries work without authentication
- [ ] Logout clears session and cookies

### Performance Metrics
- [ ] Login flow completes in < 3 seconds
- [ ] Session validation takes < 50ms
- [ ] GraphQL queries add < 10ms overhead for auth

### Security Checks
- [ ] Cookies are HttpOnly and Secure
- [ ] CSRF protection via state parameter
- [ ] Sessions expire correctly
- [ ] No sensitive data in logs

## Success Indicators

1. **Complete Integration:** biblio-stats-graphql uses all auth modules from swissoid-back
2. **No Custom Code:** No auth code written specifically for biblio-stats
3. **Configuration Only:** Auth setup is purely configuration-based
4. **Full Functionality:** All auth features work (login, logout, session, protection)
5. **Independent Operation:** Works standalone without gateway or federation

## Comparison with cronide-user

| Feature | cronide-user (Phase 1) | biblio-stats-graphql (Phase 2) |
|---------|------------------------|----------------------------------|
| Auth Source | swissoid-back modules | Same swissoid-back modules |
| Configuration | Existing config | New config for biblio-stats |
| Domain | .clockize.com | .biblio-stats.example.com |
| Client ID | clockize/cronide | biblio-stats |
| Session Name | clockize_session | biblio_session |
| Functionality | ✅ Working | ✅ Should work identically |

## Next Phase Preview

Phase 3 will extract frontend authentication components from clockize-react into swissoid-front, creating reusable React hooks and components for authentication.