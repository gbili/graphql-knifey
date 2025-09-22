# Phases 5-7: Gateway Migration and DAT Implementation

## Phase 5: Move Auth to Gateway

### Objective
Relocate authentication from cronide-user to cronide-gateway, making the gateway the single authentication point for the entire system.

### Current State
- cronide-user handles all auth (login, sessions, cookies)
- Gateway just forwards requests
- Subgraphs expect JWTs but receive cookies (broken)

### Target State After Phase 5
- Gateway handles all auth endpoints
- cronide-user becomes pure user domain service
- **Deeper broken state**: Gateway has auth but can't communicate with subgraphs

### Implementation Steps

#### Step 5.1: Add swissoid-back to Gateway

```typescript
// cronide-gateway/package.json
{
  "dependencies": {
    "swissoid-back": "latest",  // Has our auth modules
    "graphql-knifey": "latest", // For base GraphQL utilities
    "redis": "^4.0.0",
    "cookie-parser": "^1.4.6",
    "express-session": "^1.17.3"
  }
}
```

#### Step 5.2: Update Gateway Loaders

```typescript
// cronide-gateway/src/loaders/index.ts
import {
  oidcRoutesLDEGen,
  swissoidSessionServiceLDEGen,
  cookieManagerLDEGen,
  swissoidJWTVerifierLDEGen
} from 'swissoid-back';
import env from './env';
import endpoints from './endpoints';
import loggerDict from './logger';
import DiContainer from 'di-why';
import express from './express';
import apolloGateway from './apolloGateway';
import apolloServer from './apolloServer';
import supergraphSdl from './supergraphSdl';
import userEndpointUrl from './userEndpointUrl';
import redisClient from './redisClient'; // NEW

const injectionDict = {
  env,
  endpoints,
  logger: loggerDict,
  userEndpointUrl,
  express,
  apolloGateway,
  apolloServer,
  supergraphSdl,

  // NEW: Authentication modules
  redisClient,
  oidcRoutes: oidcRoutesLDEGen({
    clientId: 'clockize',
    cookieDomain: '.clockize.com',
    callbackUrl: 'https://gateway.clockize.com/oidc/callback'
  }),
  sessionService: swissoidSessionServiceLDEGen({
    sessionTTL: 7200,
    cookieName: 'clockize_session'
  }),
  cookieManager: cookieManagerLDEGen(),
  jwtVerifier: swissoidJWTVerifierLDEGen(),
};
```

#### Step 5.3: Mount Auth Routes on Gateway

```typescript
// cronide-gateway/src/loaders/express.ts
import { LoadDictElement } from "di-why/build/src/DiContainer";
import express from 'express';
import cookieParser from 'cookie-parser';

const loadDictElement: LoadDictElement<express.Application> = {
  factory: ({ oidcRoutes, logger }) => {
    const app = express();

    // Cookie parser must run first
    app.use(cookieParser());

    // Mount auth routes at gateway level
    app.use(oidcRoutes);  // Handles /login, /oidc/callback, /auth/*

    // Health check
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    logger.info('Gateway express app configured with auth routes');

    return app;
  },
  locateDeps: {
    oidcRoutes: 'oidcRoutes',
    logger: 'logger'
  }
};
```

#### Step 5.4: Remove Auth from cronide-user

```typescript
// cronide-user/src/loaders/index.ts
const dict = {
  // REMOVE these:
  // oidcRoutes,
  // oidcStandardRoutes,
  // sessionService,
  // redisClient,

  // KEEP only user domain:
  userModel,
  userService,
  apolloContext: apolloContextLDEGen({
    userService: 'userService'
    // No more auth services
  }),
};
```

```typescript
// cronide-user/src/graphql/resolvers/user.ts
const resolvers = {
  Query: {
    getUser: async (_, __, { userService }) => {
      // REMOVE all auth checks - gateway will handle
      // This will be broken until Phase 7
      return await userService.getUser();
    }
  }
  // Remove tradeToken, other auth-related mutations
};
```

### Expected Broken State
- ✅ Login redirects to gateway
- ✅ Gateway creates sessions
- ❌ Subgraphs can't validate (no DATs yet)
- ❌ All GraphQL queries fail authentication

---

## Phase 6: Implement DAT Minting in Gateway

### Objective
Gateway mints Downstream Auth Tokens (DATs) for subgraphs, establishing trust between gateway and services.

### Implementation Steps

#### Step 6.1: Create DAT Service

```typescript
// cronide-gateway/src/services/DATService.ts
import jwt from 'jsonwebtoken';
import { generateKeyPairSync } from 'crypto';
import { LoadDictElement } from 'di-why/build/src/DiContainer';

export interface DATClaims {
  sub: string;      // User ID
  email?: string;
  roles?: string[];
  scopes?: string[];
  tenant?: string;
  sessionId?: string;
}

export class DATService {
  private privateKey: string;
  private publicKey: string;
  private kid: string;

  constructor(private config: {
    ttl: number;
    issuer: string;
    audience: string;
  }) {
    // Generate key pair for DAT signing
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.kid = `gateway-${Date.now()}`;
  }

  async mint(claims: DATClaims): Promise<string> {
    return jwt.sign(
      {
        ...claims,
        iss: this.config.issuer,
        aud: this.config.audience,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + this.config.ttl,
      },
      this.privateKey,
      {
        algorithm: 'RS256',
        keyid: this.kid
      }
    );
  }

  getJWKS() {
    // Convert public key to JWK format
    return {
      keys: [{
        kty: 'RSA',
        kid: this.kid,
        use: 'sig',
        alg: 'RS256',
        n: '...', // Extract from public key
        e: 'AQAB'
      }]
    };
  }
}

export const datServiceLDEGen: LoadDictElement<DATService> = {
  factory: ({ appConfig }) => {
    return new DATService({
      ttl: 180, // 3 minutes
      issuer: 'cronide-gateway',
      audience: 'cronide-subgraphs'
    });
  },
  locateDeps: {
    appConfig: 'appConfig'
  }
};
```

#### Step 6.2: Update RequestHeadersForwarder

```typescript
// cronide-gateway/src/RequestHeadersForwarder.ts
import { GraphQLDataSourceProcessOptions, RemoteGraphQLDataSource } from "@apollo/gateway";
import { GraphQLDataSourceRequestKind } from "@apollo/gateway/dist/datasources/types";

export default class RequestHeadersForwarder extends RemoteGraphQLDataSource {
  constructor(
    private datService: any,
    private sessionService: any
  ) {
    super();
  }

  async willSendRequest(options: GraphQLDataSourceProcessOptions) {
    if (options.kind !== GraphQLDataSourceRequestKind.INCOMING_OPERATION) return;

    const incomingRequest = options.incomingRequestContext?.request;
    if (!incomingRequest) return;

    const headers = incomingRequest.http?.headers || new Headers();
    const outgoingRequest = options.request;

    // Check for existing Bearer token (backward compat for services using direct JWT)
    const authHeader = headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      // Forward as-is for backward compatibility
      outgoingRequest.http?.headers.set('Authorization', authHeader);
      return;
    }

    // Extract cookies and validate session
    const cookieHeader = headers.get('cookie');
    if (!cookieHeader) return;

    // Parse session cookie
    const cookies = this.parseCookies(cookieHeader);
    const sessionId = cookies['clockize_session'];

    if (!sessionId) return;

    try {
      // Validate session
      const session = await this.sessionService.validate(sessionId);
      if (!session) return;

      // Mint DAT for subgraphs
      const dat = await this.datService.mint({
        sub: session.userId,
        email: session.metadata?.email,
        roles: session.metadata?.roles || [],
        scopes: session.metadata?.scopes || [],
        sessionId: sessionId
      });

      // Forward DAT as Bearer token
      outgoingRequest.http?.headers.set('Authorization', `Bearer ${dat}`);

      // Optional: Also set as headers for debugging
      outgoingRequest.http?.headers.set('X-User-Id', session.userId);
      outgoingRequest.http?.headers.set('X-Session-Id', sessionId);

      console.log(`[Gateway] Minted DAT for user ${session.userId}`);
    } catch (error) {
      console.error('[Gateway] Failed to mint DAT:', error);
    }
  }

  private parseCookies(cookieString: string): Record<string, string> {
    return cookieString.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
  }
}
```

#### Step 6.3: Update Gateway Apollo Configuration

```typescript
// cronide-gateway/src/loaders/apolloGateway.ts
import { LoadDictElement } from "di-why/build/src/DiContainer";
import { ApolloGateway } from '@apollo/gateway';
import RequestHeadersForwarder from "../RequestHeadersForwarder";

const loadDictElement: LoadDictElement<InstanceType<typeof ApolloGateway>> = {
  constructible: ApolloGateway,
  locateDeps: {
    supergraphSdl: 'supergraphSdl',
    datService: 'datService',        // NEW
    sessionService: 'sessionService', // NEW
  },
  deps: {
    buildService({ name, url }, { datService, sessionService }) {
      // Pass services to forwarder
      return new RequestHeadersForwarder(datService, sessionService);
    }
  },
};
```

#### Step 6.4: Add JWKS Endpoint to Gateway

```typescript
// cronide-gateway/src/loaders/express.ts
app.get('/.well-known/jwks.json', (req, res) => {
  const jwks = datService.getJWKS();
  res.json(jwks);
});
```

### Validation After Phase 6
- ✅ Gateway validates cookies
- ✅ Gateway mints DATs
- ✅ DATs are forwarded as Bearer tokens
- ✅ JWKS endpoint is available
- ❌ Subgraphs still can't validate (wrong issuer/key)

---

## Phase 7: Configure Subgraphs to Accept DATs

### Objective
Update all subgraphs to validate Gateway-minted DATs instead of SwissOID JWTs.

### Implementation Steps

#### Step 7.1: Update Token Config in Subgraphs

```typescript
// cronide-tag/src/loaders/tokenConfig.ts
export default {
  factory: () => ({
    // Change from SwissOID to Gateway
    issuer: 'cronide-gateway',
    audience: 'cronide-subgraphs',
    jwksUri: 'https://gateway.clockize.com/.well-known/jwks.json',
    algorithms: ['RS256']
  })
};
```

```typescript
// cronide-project/src/loaders/tokenConfig.ts
// Same changes as cronide-tag
```

#### Step 7.2: Update Token Auth Service

```typescript
// cronide-tag/src/loaders/tokenAuthService.ts
import { LoadDictElement } from 'di-why/build/src/DiContainer';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const loadDictElement: LoadDictElement<any> = {
  factory: ({ tokenConfig, logger }) => {
    const jwks = createRemoteJWKSet(new URL(tokenConfig.jwksUri));

    return {
      async authenticateTokenStrategy({ token }) {
        try {
          const { payload } = await jwtVerify(token, jwks, {
            issuer: tokenConfig.issuer,
            audience: tokenConfig.audience
          });

          logger.debug('[TokenAuth] Validated DAT for user:', payload.sub);

          return {
            UUID: payload.sub,
            email: payload.email,
            roles: payload.roles || [],
            scopes: payload.scopes || [],
            sessionId: payload.sessionId
          };
        } catch (error) {
          logger.error('[TokenAuth] DAT validation failed:', error);
          throw new Error('Invalid or expired DAT');
        }
      }
    };
  },
  locateDeps: {
    tokenConfig: 'tokenConfig',
    logger: 'logger'
  }
};
```

#### Step 7.3: Test Each Subgraph

```bash
# Test cronide-tag
curl -X POST https://gateway.clockize.com/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: clockize_session=<session-id>" \
  -d '{ "query": "{ getUserTagList { tagList } }" }'

# Should work! Gateway validates cookie, mints DAT, tag service validates DAT
```

#### Step 7.4: Update cronide-user for Federation

```typescript
// cronide-user/src/graphql/resolvers/user.ts
const resolvers = {
  Query: {
    getUser: async (_, __, context) => {
      // Context now has user from DAT (via gateway)
      if (!context.user) {
        throw new Error('Authentication required');
      }

      return await context.userService.getUser({
        userId: context.user.UUID
      });
    }
  },

  User: {
    __resolveReference: async (userRef, context) => {
      // Federation queries also get DAT context
      if (!context.user) {
        return null;
      }

      return await context.userService.getUser({
        userId: userRef.UUID
      });
    }
  }
};
```

### System Flow After Phase 7

```
1. Browser → Cookie → Gateway
2. Gateway → Validate Session → Get User
3. Gateway → Mint DAT (3 min TTL) → Sign with Gateway Key
4. Gateway → Forward Request + DAT → Subgraph
5. Subgraph → Validate DAT → Process Request
6. Subgraph → Response → Gateway
7. Gateway → Response → Browser
```

### Performance Considerations

#### DAT Caching Strategy
```typescript
// Gateway can cache DATs for same session
class DATCache {
  private cache = new Map<string, { dat: string; expires: number }>();

  get(sessionId: string): string | null {
    const cached = this.cache.get(sessionId);
    if (!cached) return null;

    if (Date.now() > cached.expires) {
      this.cache.delete(sessionId);
      return null;
    }

    return cached.dat;
  }

  set(sessionId: string, dat: string, ttl: number) {
    this.cache.set(sessionId, {
      dat,
      expires: Date.now() + (ttl * 1000)
    });
  }
}
```

### Security Validation

#### Phase 7 Security Checklist
- [ ] DATs have short TTL (2-3 minutes)
- [ ] DATs are signed with Gateway's private key
- [ ] Subgraphs validate against Gateway's public key
- [ ] Session validation happens at gateway only
- [ ] No cookies forwarded to subgraphs
- [ ] Backward compatibility for direct JWTs

### Monitoring and Debugging

```typescript
// Add logging at each step
logger.info('[Gateway] Session validated', { userId, sessionId });
logger.info('[Gateway] DAT minted', { userId, exp });
logger.info('[Subgraph] DAT validated', { userId, remaining_ttl });
```

## Success Criteria for Phases 5-7

### Phase 5 Success
- [ ] Auth routes removed from cronide-user
- [ ] Gateway handles login/logout
- [ ] Sessions created at gateway level
- [ ] System is broken (expected)

### Phase 6 Success
- [ ] Gateway mints DATs
- [ ] DATs forwarded as Bearer tokens
- [ ] JWKS endpoint available
- [ ] DAT structure is correct

### Phase 7 Success
- [ ] All subgraphs validate DATs
- [ ] GraphQL queries work end-to-end
- [ ] Performance acceptable (< 10ms overhead)
- [ ] System fully functional

## Rollback Plan

If issues occur at any phase:

1. **Phase 5 Rollback**: Re-enable auth routes in cronide-user
2. **Phase 6 Rollback**: Forward cookies instead of DATs
3. **Phase 7 Rollback**: Configure subgraphs back to SwissOID

## Testing Strategy

### Integration Test Suite
```typescript
describe('Gateway Auth Flow', () => {
  it('should complete full auth cycle', async () => {
    // 1. Login
    const loginRes = await request(gateway).get('/login');
    expect(loginRes.status).toBe(302);

    // 2. Create session
    const session = await sessionService.create('test-user');

    // 3. Make GraphQL request with cookie
    const graphqlRes = await request(gateway)
      .post('/graphql')
      .set('Cookie', `clockize_session=${session.sessionId}`)
      .send({ query: '{ getUserTagList { tagList } }' });

    // 4. Should succeed
    expect(graphqlRes.body.data).toBeDefined();
  });
});
```

## Migration Timeline

- **Day 1**: Phase 5 - Move auth to gateway
- **Day 2**: Phase 6 - Implement DAT minting
- **Day 3**: Phase 7 - Configure subgraphs
- **Day 4**: Testing and monitoring
- **Day 5**: Performance tuning

## Next Phase Preview

Phase 8 will package all the gateway DAT functionality into reusable modules in swissoid-back, completing the journey.