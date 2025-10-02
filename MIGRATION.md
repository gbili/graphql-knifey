# Migration Guide

## 8.0.0 - Removed Custom CSRF Protection

### Breaking Changes

**Removed**: Custom double-submit cookie CSRF validation from `graphqlMiddleware.ts`

### What Changed

Version 7.x included custom CSRF protection that required:
- Server to issue `csrf-token` cookies via `issueCsrfCookie()` / `clearCsrfCookie()`
- Client to read the `csrf-token` cookie
- Client to send `X-CSRF-Token` header on mutations
- Server to validate cookie value matches header value

Version 8.0.0 **removes** all of this custom CSRF code.

### Why the Change

Apollo Server's built-in `csrfPrevention: true` provides equivalent protection without requiring:
- Client-side cookie reading (simpler client code)
- Manual header attachment (works automatically)
- Server-side token generation/validation (less server code)

Apollo's CSRF prevention works by requiring specific HTTP headers (like `Content-Type: application/json`) that cannot be set by simple HTML forms or `<img>` tags, effectively preventing CSRF attacks.

### Migration Steps

#### 1. Update Client Code

**Before (7.x)**:
```typescript
import { ensureCSRFToken } from './utils/csrf';

const authLink = setContext((_, { headers }) => {
  const csrfToken = ensureCSRFToken();
  return {
    headers: {
      ...headers,
      'X-CSRF-Token': csrfToken,
    },
  };
});
```

**After (8.0.0)**:
```typescript
// No CSRF token needed - Apollo handles it automatically
const authLink = setContext((_, { headers }) => {
  return { headers };
});
```

#### 2. Update Server Code

**Remove these calls**:
- `issueCsrfCookie(res, ...)`
- `clearCsrfCookie(res, ...)`
- Any custom CSRF middleware

**Verify Apollo Server config**:
```typescript
new ApolloServer({
  // ...
  csrfPrevention: true, // Default in Apollo Server v4
});
```

#### 3. Clean Up

- Delete `csrf.ts` utility files from client code
- Remove `X-CSRF-Token` from logging redaction lists (optional)
- Update tests that expect `csrf-token` cookie

### Server Type Behavior

| Server Type | CSRF Protection |
|-------------|----------------|
| **Gateway** | Apollo's `csrfPrevention: true` |
| **Standalone** | Apollo's `csrfPrevention: true` |
| **Subgraph** | `csrfPrevention: false` (server-to-server only) |

### Security Impact

**No reduction in security** - Apollo's CSRF prevention is:
- Industry standard
- Battle-tested across millions of deployments
- Recommended by Apollo team
- Simpler and more reliable than custom implementations

### Rollback Plan

If you need to keep using custom CSRF tokens temporarily:
1. Stay on graphql-knifey 7.x
2. Do not upgrade to 8.0.0 until clients are updated
3. Coordinate frontend and backend deployments

### Questions?

See Apollo's CSRF documentation: https://www.apollographql.com/docs/apollo-server/security/cors
