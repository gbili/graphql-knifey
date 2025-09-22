# Authentication Architecture Plan

## Executive Summary

Move all authentication logic out of subgraph cronide-user, and centralize it at the Gateway/Edge level. Then make the gateway mint DATs for subgraphs (cronide-user, cronide-tag, cronide-project). Package reusable authentication components into `swissoid-back` (server-side) and `swissoid-front` (React) packages.

## Current Problems

1. **cronide-user** is doing authentication validation in GraphQL resolvers (mixing concerns)
2. **tags service** expects JWT tokens but receives cookies (causing errors)
3. **Gateway** forwards cookies to subgraphs, forcing each to validate independently
4. Authentication logic is scattered and not reusable across different projects (by "projects" we mean completely different projects (../biblio-stats-graphql is an example of different project), not different services/subgraphs (../cronide-tag is an example of different service/subgraph))

## Architecture Decisions

### ✅ ADOPT: Core Principles

1. **Move auth out of subgraphs**
   - cronide-user becomes pure user domain service (profiles, preferences)
   - Gateway validates authentication ONCE
   - Subgraphs trust gateway-provided identity

2. **Package reusable auth components**
   - `swissoid-back`: Server-side OIDC, sessions, middleware
   - `swissoid-front`: React hooks, providers, protected routes

3. **Security defaults** (already implemented correctly)
   ```typescript
   cookies: {
     httpOnly: true,
     secure: true,
     sameSite: 'lax',
     domain: '.clockize.com',
     path: '/'
   }
   ```

### ✅ ADOPT: DAT Strategy (Corrected Analysis)

1. **DATs (Downstream Auth Tokens) ARE NEEDED**
   - Subgraphs already expect JWT tokens (`tokenAuthService.authenticateTokenStrategy`)
   - Replacing SwissOID JWTs with Gateway-minted DATs requires NO subgraph changes
   - Maintains existing security model with proper token validation

2. **Gateway JWKS endpoint IS USEFUL**
   - Subgraphs can validate DATs against Gateway's public key
   - Enables key rotation without service restarts
   - Standard OIDC pattern

3. **Short TTLs (2-3 minutes) MAKE SENSE**
   - Limits exposure if DAT is compromised
   - Gateway can always mint fresh tokens
   - Matches session validation frequency

### 📁 Package Structure

#### `swissoid-back` (new package)

```typescript
// swissoid-back - SwissOID authentication package
export { oidcRoutesLDEGen } from './oidc/routes';
export { swissoidSessionServiceLDEGen } from './session/service';
export { cookieManagerLDEGen } from './cookies/manager';
export { swissoidJWTVerifierLDEGen } from './jwt/verifier';
export { gatewayAuthForwarderLDEGen } from './federation/forwarder';
export { datServiceLDEGen } from './federation/datService';
export { subgraphAuthContextLDEGen } from './federation/context';

// Dependencies
{
  "dependencies": {
    "graphql-knifey": "^1.0.0",  // For base SessionService, etc.
    "jose": "^4.0.0",
    "express": "^4.0.0"
  }
}
```

#### `swissoid-front` (new React package)

```typescript
export { SwissoidAuthProvider } from './providers/AuthProvider';
export { useSwissoidAuth } from './hooks/useAuth';
export { AuthenticatedRoute } from './components/AuthenticatedRoute';
export { createApolloClient } from './clients/apollo';
```

## Implementation Phases

### Phase 1: Create swissoid-back Package
**Goal:** Create new `swissoid-back` package and extract all SwissOID authentication components from cronide-user into it

**Steps:**
1. **Create new swissoid-back package:**
   - Initialize npm package
   - Set up TypeScript configuration
   - Add dependencies (including graphql-knifey for base services)

2. **Extract from cronide-user to swissoid-back:**
   - OIDC routes (`/login`, `/oidc/callback`, `/auth/status`, `/auth/logout`)
   - SwissOID-specific session service
   - JWT verification for SwissOID tokens
   - Cookie handling utilities

3. **Package structure:**
   ```typescript
   // swissoid-back exports
   export { oidcRoutesLDEGen } from './oidc/routes';
   export { swissoidSessionServiceLDEGen } from './session/service';
   export { cookieManagerLDEGen } from './cookies/manager';
   export { swissoidJWTVerifierLDEGen } from './jwt/verifier';
   ```

4. **Documentation:**
   - How to integrate in standalone server (non-gateway)
   - Configuration requirements
   - Environment variables needed

**Validation:** cronide-user still works using swissoid-back (same broken state - subgraphs receive cookies)

---

### Phase 2: Test Backend in biblio-stats-graphql
**Goal:** Validate swissoid-back works in a standalone GraphQL service

**Steps:**
1. **Integrate swissoid-back into biblio-stats-graphql:**
   ```typescript
   import { oidcRoutesLDEGen, sessionServiceLDEGen } from 'swissoid-back';

   const dict = {
     oidcRoutes: oidcRoutesLDEGen({ clientId: 'biblio-stats' }),
     sessionService: sessionServiceLDEGen(),
     // ... existing services
   };
   ```

2. **Configure for SwissOID:**
   - Set up redirect URIs
   - Configure cookie domains
   - Test login flow

**Validation:** biblio-stats-graphql can authenticate users via cookies

---

### Phase 3: Extract Frontend Auth (swissoid-front)
**Goal:** Extract authentication components from clockize-react into reusable package

**Steps:**
1. **Extract from clockize-react:**
   - `AuthenticatedOrRedirect` component
   - `LoginContext` provider
   - Auth status checking logic
   - Apollo client configuration with credentials

2. **Package into swissoid-front:**
   ```typescript
   export { SwissoidAuthProvider } from './providers/AuthProvider';
   export { useSwissoidAuth } from './hooks/useAuth';
   export { AuthenticatedRoute } from './components/AuthenticatedRoute';
   export { createApolloClient } from './clients/apollo';
   ```

**Validation:** clockize-react still works with extracted components (cronide-user still broken)

---

### Phase 4: Test Frontend in biblio-stats-react
**Goal:** Validate complete swissoid-front + swissoid-back integration

**Steps:**
1. **Integrate swissoid-front into biblio-stats-react:**
   ```tsx
   import { SwissoidAuthProvider, AuthenticatedRoute } from 'swissoid-front';

   <SwissoidAuthProvider backendUrl={BACKEND_URL}>
     <AuthenticatedRoute>
       <ProtectedContent />
     </AuthenticatedRoute>
   </SwissoidAuthProvider>
   ```

2. **Test end-to-end:**
   - Login flow
   - Protected routes
   - GraphQL requests with cookies

**Validation:** biblio-stats (react+graphql) fully functional with swissoid packages

---

### Phase 5: Move Auth to Gateway
**Goal:** Relocate authentication from cronide-user to cronide-gateway

**Steps:**
1. **Add swissoid-back to gateway:**
   - Mount OIDC routes on gateway
   - Configure session validation
   - Remove auth routes from cronide-user

2. **Update cronide-user:**
   - Remove all auth handling
   - Become pure user domain service
   - Keep only user data operations

**Expected State:** Deeper broken state - gateway handles auth but can't communicate with subgraphs

---

### Phase 6: Implement DAT Minting in Gateway
**Goal:** Gateway mints Downstream Auth Tokens for subgraphs

**Steps:**
1. **Create DAT service in gateway:**
   ```typescript
   class DATService {
     async mint(claims) {
       return jwt.sign(claims, privateKey, {
         expiresIn: '3m',
         issuer: 'cronide-gateway',
         audience: 'cronide-subgraphs'
       });
     }
   }
   ```

2. **Update RequestHeadersForwarder:**
   - Validate cookies/session
   - Mint DAT
   - Forward as Bearer token

3. **Add JWKS endpoint to gateway:**
   - `/.well-known/jwks.json`
   - Publish gateway's public key

**Validation:** Subgraphs receive DATs as Bearer tokens

---

### Phase 7: Configure Subgraphs to Accept DATs
**Goal:** Subgraphs validate Gateway-minted tokens instead of SwissOID tokens

**Steps:**
1. **Update tokenAuthService configuration:**
   ```typescript
   tokenAuthService: {
     jwksUri: 'https://gateway.clockize.com/.well-known/jwks.json',
     issuer: 'cronide-gateway',
     audience: 'cronide-subgraphs'
   }
   ```

2. **Test each subgraph:**
   - cronide-tag
   - cronide-project
   - cronide-user (for federated queries)

**Validation:** Complete system works with cookie → DAT flow

---

### Phase 8: Package Gateway Features
**Goal:** Make DAT functionality reusable in swissoid-back

**Steps:**
1. **Extract from gateway to swissoid-back:**
   ```typescript
   export { datServiceLDEGen } from './federation/DATService';
   export { gatewayAuthForwarderLDEGen } from './federation/GatewayAuthForwarder';
   export { jwksPublisherLDEGen } from './federation/JWKSPublisher';
   export { subgraphAuthContextLDEGen } from './federation/SubgraphAuthContext';
   ```

2. **Documentation:**
   - How to set up federated authentication
   - DAT claims structure
   - Key rotation strategy

**Final Validation:** Any project can use swissoid-back for both standalone and federated auth

---

## Success Milestones

| Phase | Milestone | Validation |
|-------|-----------|------------|
| 1 | Backend auth extracted | cronide-user unchanged (still broken) |
| 2 | Standalone auth works | biblio-stats-graphql authenticates |
| 3 | Frontend auth extracted | clockize-react unchanged |
| 4 | Full stack auth works | biblio-stats fully functional |
| 5 | Auth moved to gateway | Deeper broken state achieved |
| 6 | DATs implemented | Tokens reach subgraphs |
| 7 | Subgraphs accept DATs | System fully functional |
| 8 | Gateway features packaged | Reusable for any project |

## What We Keep vs Change

| Current Implementation | Keep/Change | Reason |
|------------------------|-------------|---------|
| `oidcStandardRoutes` | Keep name | Already descriptive |
| `sessionService` | Keep | Already in graphql-knifey |
| Cookie forwarding | Change to headers | Simpler, no validation in subgraphs |
| JWT validation in subgraphs | Remove | Gateway handles all auth |
| Scattered auth logic | Package | Reusability across projects |

## Success Criteria

1. ✅ Tags service stops throwing "no token" errors
2. ✅ Gateway validates sessions once (not each subgraph)
3. ✅ Auth logic extracted into reusable packages
4. ✅ Backward compatibility maintained (JWT still works)
5. ✅ Any new project can add SwissOID auth in minutes

## Non-Goals

- Complex DAT token system (unnecessary)
- Gateway JWKS for internal services (overcomplicated)
- Rewriting working code that just needs packaging
- Breaking existing JWT-based integrations

## Timeline

- **Week 1**: Fix immediate gateway/subgraph communication issue
- **Week 2**: Extract and package authentication modules
- **Week 3**: Test with biblio-stats as pilot project
- **Week 4**: Documentation and rollout guide