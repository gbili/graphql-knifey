# Phase 4: Integrate swissoid-front into biblio-stats-react

## Objective
Replace the custom local `SwissOIDAuthContext` in biblio-stats-react with the reusable `swissoid-front` package, proving that the frontend package works across different React applications.

## Prerequisites
- Phase 3 completed: `swissoid-front` package published and tested in clockize-react
- biblio-stats-graphql backend already integrated with `swissoid-back` (Phase 2 complete)
- biblio-stats-react currently has a custom local auth implementation

## Current State of biblio-stats-react

### Existing Auth Implementation (Local)

```typescript
// src/contexts/SwissOIDAuthContext.tsx (LOCAL - to be removed)
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

// Custom implementation that:
// - Checks auth by making GraphQL query to /graphql
// - Redirects to /auth/login
// - Calls /auth/logout and /auth/refresh
```

### Current Integration Points

1. **index.tsx**: Wraps app with local `SwissOIDAuthProvider`
2. **AuthenticatedOrRedirect.tsx**: Uses local `useAuth()` hook
3. **App.tsx**: Routes include protected pages
4. **graphql.ts**: Apollo client with `credentials: 'include'`

### Environment Configuration

```env
VITE_ENDPOINT=http://localhost:3666
```

## Implementation Steps

### Step 1: Install swissoid-front

```bash
cd /Volumes/AppleFS/kDrive/Documents/workspace/biblio-stats-react
npm install swissoid-front@latest
```

Expected version: `^0.1.4` (or latest)

### Step 2: Update index.tsx

**Before:**
```typescript
// src/index.tsx
import { SwissOIDAuthProvider } from './contexts/SwissOIDAuthContext';

root.render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <SwissOIDAuthProvider>
        <App />
      </SwissOIDAuthProvider>
    </ApolloProvider>
  </React.StrictMode>
);
```

**After:**
```typescript
// src/index.tsx
import { SwissOIDAuthProvider } from 'swissoid-front';

root.render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <SwissOIDAuthProvider
        backendUrl={import.meta.env.VITE_ENDPOINT}
        pollIntervalMs={30_000}
      >
        <App />
      </SwissOIDAuthProvider>
    </ApolloProvider>
  </React.StrictMode>
);
```

### Step 3: Update AuthenticatedOrRedirect Component

**Before:**
```typescript
// src/components/AuthenticatedOrRedirect.tsx
import { useAuth } from "../contexts/SwissOIDAuthContext";

const AuthenticatedOrRedirect: React.FC<AuthenticatedOrRedirectProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  if (isAuthenticated) {
    return children;
  }

  return <Navigate to={ROUTE_ROOT.definition} />;
}
```

**After (Option 1: Direct AuthGuard):**
```typescript
// src/components/AuthenticatedOrRedirect.tsx
import { AuthGuard } from 'swissoid-front';
import Loading from './Loading/Loading';
import { Navigate } from 'react-router-dom';
import { ROUTE_ROOT } from '../config/routePaths';

const AuthenticatedOrRedirect: React.FC<{ children: JSX.Element }> = ({ children }) => (
  <AuthGuard
    loadingFallback={<Loading />}
    unauthenticatedFallback={<Navigate to={ROUTE_ROOT.definition} replace />}
  >
    {children}
  </AuthGuard>
);

export default AuthenticatedOrRedirect;
```

**After (Option 2: Keep useAuth pattern):**
```typescript
// src/components/AuthenticatedOrRedirect.tsx
import { useSwissOIDAuth } from 'swissoid-front';
import Loading from './Loading/Loading';
import { Navigate } from 'react-router-dom';
import { ROUTE_ROOT } from '../config/routePaths';

const AuthenticatedOrRedirect: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { authenticated, loading } = useSwissOIDAuth();

  if (loading) {
    return <Loading />;
  }

  if (authenticated) {
    return children;
  }

  return <Navigate to={ROUTE_ROOT.definition} replace />;
};

export default AuthenticatedOrRedirect;
```

### Step 4: Update Components Using Auth

Find all components using the local `useAuth()` and replace:

**Before:**
```typescript
import { useAuth } from '../contexts/SwissOIDAuthContext';

const MyComponent = () => {
  const { user, isAuthenticated, login, logout } = useAuth();
  // ...
}
```

**After:**
```typescript
import { useSwissOIDAuth } from 'swissoid-front';

const MyComponent = () => {
  const { user, authenticated, login, logout } = useSwissOIDAuth();
  // Note: isAuthenticated -> authenticated
  // ...
}
```

### Step 5: Remove Local Auth Context

```bash
# Remove the local auth context file
rm src/contexts/SwissOIDAuthContext.tsx

# Optionally remove LoginContext.tsx if not used
rm src/contexts/LoginContext.tsx
```

### Step 6: Add Auth Debug Page (Optional)

```typescript
// src/pages/AuthDebugPage.tsx (NEW)
import React from 'react';
import { AuthDebugPanel } from 'swissoid-front';

const AuthDebugPage: React.FC = () => (
  <div style={{ padding: '1.5rem' }}>
    <AuthDebugPanel />
  </div>
);

export default AuthDebugPage;
```

```typescript
// Add to src/App.tsx routes
import AuthDebugPage from './pages/AuthDebugPage';

// In Routes:
<Route key={"debug"} path="/auth-debug" element={<AuthDebugPage />} />
```

### Step 7: Update package.json Scripts (if needed)

No changes needed - `swissoid-front` is a runtime dependency.

## Migration Mapping

| Local Implementation | swissoid-front Equivalent | Notes |
|---------------------|---------------------------|-------|
| `SwissOIDAuthProvider` | `SwissOIDAuthProvider` | Same name, different import |
| `useAuth()` | `useSwissOIDAuth()` | Different name |
| `isAuthenticated` | `authenticated` | Property name change |
| `isLoading` | `loading` | Property name change |
| `login()` | `login()` | Same signature |
| `logout()` | `logout()` | Enhanced with options |
| `refreshToken()` | `refreshSession()` | Different name |
| `user` | `user` | Same |
| N/A | `checkAuthStatus()` | New feature |
| N/A | `raw` | New: full backend response |
| N/A | `lastChecked` | New: timestamp |
| N/A | `error` | New: error handling |

## Configuration Comparison

### Local Implementation
- Hardcoded endpoints (`/auth/login`, `/auth/logout`, `/auth/refresh`)
- GraphQL query for auth check
- No polling
- No customization options

### swissoid-front Package
- Configurable endpoints
- Standard `/auth/status` endpoint
- Built-in polling (30s default)
- Many customization options:
  - `pollIntervalMs`
  - `endpoints` override
  - `transformUser`
  - `loginRedirectParam`
  - `logoutRedirectTo`
  - `defaultHeaders`
  - `fetchImplementation`

## Backend Compatibility

The biblio-stats-graphql backend (Phase 2) already provides the required endpoints:

- ✅ `/login` → Initiates OIDC flow
- ✅ `/oidc/callback` → OIDC callback handler
- ✅ `/auth/status` → Returns session status (required by swissoid-front)
- ✅ `/auth/logout` → Clears session
- ✅ `/auth/refresh` → Refreshes session (optional)

**Note:** The local implementation used a GraphQL query to check auth, but `swissoid-front` expects a proper `/auth/status` endpoint (already provided by swissoid-back).

## Files to Modify

```
biblio-stats-react/
├── package.json                                    # Add swissoid-front dependency
├── src/
│   ├── index.tsx                                   # Update provider import
│   ├── components/
│   │   └── AuthenticatedOrRedirect.tsx             # Update to use swissoid-front
│   ├── contexts/
│   │   └── SwissOIDAuthContext.tsx                 # DELETE (replaced by package)
│   └── pages/
│       └── [any pages using useAuth]               # Update hook usage
```

## Testing Checklist

### Functional Tests
- [ ] App loads without errors
- [ ] Unauthenticated users see landing page
- [ ] Login flow redirects to backend `/login`
- [ ] After login, user is redirected back
- [ ] Protected routes are accessible when authenticated
- [ ] Protected routes redirect when unauthenticated
- [ ] User info is displayed correctly
- [ ] Logout clears session and redirects
- [ ] Session persists across page reloads
- [ ] GraphQL requests include credentials

### Developer Experience
- [ ] No TypeScript errors
- [ ] Auth debug page works (if added)
- [ ] Session polling works (check network tab)
- [ ] Console has no errors
- [ ] Hot reload works correctly

### Comparison with clockize-react
- [ ] Both apps use same `swissoid-front` version
- [ ] Auth flow works identically
- [ ] Configuration is similar (just different backend URL)

## Validation Commands

```bash
# Check swissoid-front is installed
npm list swissoid-front

# Build the app
npm run build

# Start dev server
npm start

# Check for import errors
grep -r "contexts/SwissOIDAuthContext" src/
# Should return empty after migration

# Verify swissoid-front imports
grep -r "from 'swissoid-front'" src/
# Should find all new imports
```

## Rollback Plan

If issues occur:

1. **Restore local context:**
   ```bash
   git checkout src/contexts/SwissOIDAuthContext.tsx
   ```

2. **Revert imports:**
   ```bash
   git checkout src/index.tsx src/components/AuthenticatedOrRedirect.tsx
   ```

3. **Uninstall package:**
   ```bash
   npm uninstall swissoid-front
   ```

## Environment Variables

No changes required. The existing `.env` works:

```env
VITE_ENDPOINT=http://localhost:3666  # Used by swissoid-front's backendUrl prop
```

For production (`.env.prod`):
```env
VITE_ENDPOINT=https://biblio-stats-api.example.com
```

## Expected Outcomes

### Before Migration
- ✅ Custom local auth context (~130 lines)
- ⚠️ Auth check via GraphQL query (non-standard)
- ❌ No polling
- ❌ No debug tools
- ❌ Not reusable

### After Migration
- ✅ Using `swissoid-front` package (reusable)
- ✅ Standard `/auth/status` endpoint
- ✅ Built-in polling (30s)
- ✅ Auth debug panel available
- ✅ ~90% reduction in auth code
- ✅ Consistent with clockize-react

## Success Criteria

| Criterion | Target | Validation |
|-----------|--------|------------|
| swissoid-front installed | ✅ | Check package.json |
| Local context removed | ✅ | File deleted |
| All auth flows work | ✅ | Manual testing |
| No TypeScript errors | ✅ | `npm run build` |
| Code reduction | ~90% | Line count comparison |
| Consistent with clockize-react | ✅ | Side-by-side testing |

## Timeline

- **30 minutes**: Install and update imports
- **30 minutes**: Test all auth flows
- **15 minutes**: Add debug page (optional)
- **15 minutes**: Final validation

**Total: ~1.5 hours**

## Next Phase Preview

Phase 5 will move authentication from cronide-user to cronide-gateway, marking the transition from subgraph-level auth to gateway-level auth. This creates an intentionally "deeper broken state" before implementing DATs in Phase 6-7.