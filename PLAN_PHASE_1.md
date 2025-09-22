# Phase 1: Create swissoid-back Package

## Objective
Create a new `swissoid-back` package and extract all SwissOID authentication components from cronide-user into it, while maintaining cronide-user's current functionality. This package will contain SwissOID-specific authentication logic and depend on graphql-knifey for base services.

## Current State Analysis

### What cronide-user Currently Has

#### 1. OIDC Route Handlers
**Location:** `cronide-user/src/routes/oidcStandardRoutes.ts`
- **GET /login** - Initiates OIDC flow with signed state
- **POST /oidc/callback** - Handles form_post from SwissOID
- **GET /auth/status** - Returns session status as JSON
- **POST /auth/logout** - Clears session
- **GET /auth/userinfo** - Returns user details
- **GET /auth/ping** - Health check

#### 2. Session Service
**Location:** `cronide-user/src/services/sessionService.ts`
- Redis-based session storage
- Session creation/validation/refresh
- TTL management
- User session tracking

#### 3. Redis Client
**Location:** `cronide-user/src/loaders/redisClient.ts`
- Connection management
- Used by session service

#### 4. JWT/Token Services
**Location:** `cronide-user/src/loaders/tokenAuthServiceInternal.ts`
- JWT validation for backward compatibility
- Token configuration

#### 5. Configuration
**Location:** `cronide-user/src/config/appConfig.ts`
- SwissOID endpoints
- Cookie configuration
- Session settings

## Implementation Plan

### Step 1: Create swissoid-back Package

```bash
# Create new package directory
mkdir ../swissoid-back
cd ../swissoid-back

# Initialize package
npm init -y

# Install dependencies
npm install express cookie-parser redis ioredis jose
npm install graphql-knifey  # For base SessionService, AuthStrategy, etc.
npm install -D typescript @types/node @types/express @types/cookie-parser
```

```json
// package.json
{
  "name": "swissoid-back",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest"
  },
  "dependencies": {
    "graphql-knifey": "^1.0.0",
    "express": "^4.18.0",
    "cookie-parser": "^1.4.6",
    "redis": "^4.0.0",
    "ioredis": "^5.0.0",
    "jose": "^4.0.0"
  }
}
```

### Step 2: Create Package Structure

```
swissoid-back/
├── src/
│   ├── oidc/
│   │   ├── OIDCRoutes.ts         # Route handlers
│   │   ├── OIDCController.ts     # Business logic
│   │   └── oidcRoutesLDEGen.ts   # DI loader
│   ├── session/
│   │   ├── SwissOIDSessionService.ts  # Extends graphql-knifey's SessionService
│   │   └── swissoidSessionServiceLDEGen.ts
│   ├── storage/
│   │   ├── RedisStorage.ts       # Storage implementation
│   │   └── redisClientLDEGen.ts
│   ├── cookies/
│   │   ├── CookieManager.ts      # Cookie utilities
│   │   └── cookieManagerLDEGen.ts
│   ├── jwt/
│   │   ├── SwissOIDJWTVerifier.ts  # JWT validation
│   │   └── swissoidJWTVerifierLDEGen.ts
│   ├── federation/                # For later phases
│   │   ├── DATService.ts
│   │   ├── GatewayAuthForwarder.ts
│   │   └── SubgraphAuthContext.ts
│   ├── types/
│   │   └── auth.types.ts         # SwissOID-specific types
│   └── index.ts                   # Main exports
├── dist/                          # Built output
├── tsconfig.json
└── README.md
```

### Step 3: Extract OIDC Routes

**From:** `cronide-user/src/routes/oidcStandardRoutes.ts`
**To:** `swissoid-back/src/oidc/OIDCRoutes.ts`

```typescript
// swissoid-back/src/oidc/oidcRoutesLDEGen.ts
export interface OIDCConfig {
  // SwissOID settings
  issuer: string;
  clientId: string;
  clientSecret?: string;
  tokenEndpoint: string;
  jwksUri: string;
  authorizeEndpoint: string;

  // RP settings
  callbackUrl: string;
  cookieDomain: string;
  frontendUrl: string;

  // Session settings
  sessionCookieName: string;
  sessionSecret: string;
  stateSigningSecret: string;
}

export const oidcRoutesLDEGen = (config?: Partial<OIDCConfig>) => ({
  factory: ({ app, sessionService, redisClient, logger, appConfig }) => {
    const finalConfig = { ...appConfig, ...config };
    return createOIDCRoutes({
      app,
      sessionService,
      redisClient,
      logger,
      config: finalConfig
    });
  },
  locateDeps: {
    app: 'app',
    sessionService: 'sessionService',
    redisClient: 'redisClient',
    logger: 'logger',
    appConfig: 'appConfig'
  }
});
```

### Step 4: Create SwissOID Session Service

**New:** `swissoid-back/src/session/SwissOIDSessionService.ts`
**Extends:** `graphql-knifey/src/services/SessionService.ts`

```typescript
// swissoid-back/src/session/SwissOIDSessionService.ts
import { SessionService } from 'graphql-knifey';

export interface SwissOIDSessionConfig {
  cookieDomain: string;
  cookieName: string;
  secureCookie: boolean;
  sameSite: 'strict' | 'lax' | 'none';
}

// Enhanced loader
export const swissoidSessionServiceLDEGen = (config?: Partial<SwissOIDSessionConfig>) => ({
  factory: (deps) => {
    return new SessionService(
      deps.storage,
      deps.uuid,
      {
        sessionTTL: config?.sessionTTL || 7200,
        refreshTTL: config?.refreshTTL || 604800,
        cookieDomain: config?.cookieDomain || '.clockize.com',
        cookieName: config?.cookieName || 'sid',
        ...config
      }
    );
  },
  locateDeps: {
    storage: 'redisClient',
    uuid: 'uuid'
  }
});
```

### Step 5: Create Cookie Manager

**New:** `swissoid-back/src/cookies/CookieManager.ts`

```typescript
export class CookieManager {
  constructor(private config: CookieConfig) {}

  setAuthCookies(res: Response, { sessionId, refreshId }) {
    const options = {
      domain: this.config.domain,
      httpOnly: true,
      secure: true,
      sameSite: this.config.sameSite || 'lax',
      path: '/'
    };

    res.cookie(this.config.sessionName, sessionId, {
      ...options,
      maxAge: this.config.sessionTTL * 1000
    });

    res.cookie(this.config.refreshName, refreshId, {
      ...options,
      maxAge: this.config.refreshTTL * 1000
    });
  }

  clearAuthCookies(res: Response) {
    res.clearCookie(this.config.sessionName);
    res.clearCookie(this.config.refreshName);
  }

  extractCookies(req: Request) {
    return {
      sessionId: req.cookies?.[this.config.sessionName],
      refreshId: req.cookies?.[this.config.refreshName]
    };
  }
}

export const cookieManagerLDEGen = (config?: Partial<CookieConfig>) => ({
  factory: ({ appConfig }) => {
    return new CookieManager({
      domain: config?.domain || appConfig.cookieDomain,
      sessionName: config?.sessionName || 'sid',
      refreshName: config?.refreshName || 'rid',
      ...config
    });
  },
  locateDeps: {
    appConfig: 'appConfig'
  }
});
```

### Step 6: Create JWT Verifier for SwissOID

**New:** `swissoid-back/src/jwt/SwissOIDJWTVerifier.ts`

```typescript
import { createRemoteJWKSet, jwtVerify } from 'jose';

export class SwissOIDJWTVerifier {
  private jwks;

  constructor(private config: { jwksUri: string; issuer: string }) {
    this.jwks = createRemoteJWKSet(new URL(config.jwksUri));
  }

  async verify(token: string, options?: { audience?: string }) {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.config.issuer,
        audience: options?.audience
      });
      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error };
    }
  }
}

export const swissoidJWTVerifierLDEGen = () => ({
  factory: ({ appConfig }) => {
    return new SwissOIDJWTVerifier({
      jwksUri: appConfig.swissoidJwksUri,
      issuer: appConfig.swissoidIssuer
    });
  },
  locateDeps: {
    appConfig: 'appConfig'
  }
});
```

### Step 6: Update cronide-user to Use swissoid-back

```typescript
// cronide-user/src/loaders/index.ts
import {
  oidcRoutesLDEGen,
  swissoidSessionServiceLDEGen,
  cookieManagerLDEGen,
  swissoidJWTVerifierLDEGen
} from 'swissoid-back';

const dict = {
  // Replace local implementations with swissoid-back modules
  oidcRoutes: oidcRoutesLDEGen(),
  sessionService: swissoidSessionServiceLDEGen(),
  cookieManager: cookieManagerLDEGen(),
  jwtVerifier: swissoidJWTVerifierLDEGen(),

  // Keep user-specific services
  userModel,
  userService,
  // ...rest
};
```

### Step 7: Export from swissoid-back

```typescript
// swissoid-back/src/index.ts
// Main package exports

// OIDC Authentication
export { oidcRoutesLDEGen } from './oidc/oidcRoutesLDEGen';
export { OIDCController } from './oidc/OIDCController';
export type { OIDCConfig } from './types/auth.types';

// Enhanced Session Service (extends graphql-knifey's SessionService)
export { swissoidSessionServiceLDEGen } from './session/swissoidSessionServiceLDEGen';

// Cookie Management
export { cookieManagerLDEGen, CookieManager } from './cookies/CookieManager';
export type { CookieConfig } from './types/auth.types';

// JWT Verification
export { swissoidJWTVerifierLDEGen, SwissOIDJWTVerifier } from './jwt/SwissOIDJWTVerifier';

// Types
export * from './types/auth.types';
```

## Testing Plan

### 1. Unit Tests
- [ ] OIDCRoutes route handling
- [ ] SessionService CRUD operations
- [ ] CookieManager cookie operations
- [ ] JWTVerifier token validation

### 2. Integration Tests
- [ ] Complete OIDC flow
- [ ] Session persistence in Redis
- [ ] Cookie setting/clearing
- [ ] JWT validation against SwissOID

### 3. cronide-user Validation
- [ ] Login flow still works
- [ ] Sessions are created
- [ ] Cookies are set correctly
- [ ] `/auth/status` returns correct data
- [ ] Subgraphs still receive cookies (maintaining broken state)

## Migration Checklist

- [ ] Create swissoid-back package structure
- [ ] Extract OIDC routes from cronide-user to swissoid-back
- [ ] Create SwissOIDSessionService extending graphql-knifey's SessionService
- [ ] Create CookieManager utility
- [ ] Create SwissOIDJWTVerifier
- [ ] Update cronide-user to use swissoid-back modules
- [ ] Add exports to swissoid-back index
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Test cronide-user still works (with broken subgraph state)
- [ ] Document configuration requirements

## Configuration Documentation

### Required Environment Variables

```bash
# SwissOID Configuration
SWISSOID_ISSUER=https://api.swissoid.com
SWISSOID_CLIENT_ID=your-client-id
SWISSOID_CLIENT_SECRET=your-client-secret
SWISSOID_TOKEN_ENDPOINT=https://api.swissoid.com/token
SWISSOID_JWKS_URI=https://api.swissoid.com/.well-known/jwks.json
SWISSOID_AUTHORIZE_ENDPOINT=https://api.swissoid.com/authorize

# RP Configuration
RP_CALLBACK_URL=https://your-domain.com/oidc/callback
RP_COOKIE_DOMAIN=.your-domain.com
RP_FRONTEND_URL=https://app.your-domain.com

# Session Configuration
SESSION_COOKIE_NAME=sid
REFRESH_COOKIE_NAME=rid
SESSION_SECRET=your-session-secret
STATE_SIGNING_SECRET=your-state-signing-secret

# Redis
REDIS_URL=redis://localhost:6379
```

### Usage Example

```typescript
import {
  oidcRoutesLDEGen,
  swissoidSessionServiceLDEGen
} from 'swissoid-back';
import { apolloContextLDEGen } from 'graphql-knifey';  // Base GraphQL utilities

// In your DI container
const dict = {
  oidcRoutes: oidcRoutesLDEGen({
    clientId: 'my-app',
    cookieDomain: '.my-app.com'
  }),
  sessionService: swissoidSessionServiceLDEGen({
    sessionTTL: 3600,
    cookieName: 'my_session'
  }),
  apolloContext: apolloContextWithAuthLDEGen({
    // Your GraphQL services
  })
};
```

## Success Criteria

1. **No Breaking Changes:** cronide-user continues to work exactly as before
2. **Modular Extraction:** All SwissOID auth components are in swissoid-back
3. **Reusable:** Components can be used by any project needing SwissOID auth
4. **Well-Tested:** Unit and integration tests pass
5. **Documented:** Clear configuration and usage documentation
6. **Maintains State:** Subgraphs still receive cookies (broken state preserved)
7. **Clean Separation:** graphql-knifey remains generic, swissoid-back is SwissOID-specific

## Next Phase Preview

Phase 2 will integrate swissoid-back into biblio-stats-graphql to validate that the extracted modules work in a completely different project, proving the reusability of our SwissOID authentication package.