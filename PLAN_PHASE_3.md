# Phase 3: Extract Frontend Auth (swissoid-front)

## Objective
Extract all authentication-related React components, hooks, and utilities from clockize-react into a reusable `swissoid-front` package, while maintaining clockize-react's current functionality.

## Prerequisites
- Phase 1 & 2 completed: Backend auth modules working in swissoid-back package
- New npm package created: `swissoid-front`
- clockize-react still functional (even with broken backend state)

## ✅ Implementation Status: COMPLETE

Phase 3 has been **fully implemented**. The `swissoid-front` package exists and is already in use by `clockize-react`.

## Package Structure (Actual Implementation)

```
swissoid-front/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                          # Main exports
│   ├── context/
│   │   └── SwissOIDAuthContext.tsx       # Auth provider & hook
│   ├── components/
│   │   ├── AuthGuard.tsx                 # Protected route guard
│   │   └── AuthDebugPanel.tsx            # Debug component
│   ├── helpers/
│   │   └── createBackendClient.ts        # Backend client factory
│   └── utils/
│       └── url.ts                        # URL utilities
└── dist/                                  # Built output
```

## Key Differences from Plan

### What Changed

1. **Single Context File Instead of Separate Files**
   - **Plan**: Separate `AuthProvider.tsx`, `useAuth.ts`, `types.ts`
   - **Actual**: Combined into `SwissOIDAuthContext.tsx` (cleaner, more maintainable)

2. **Component Naming**
   - **Plan**: `SwissoidAuthProvider`, `useSwissoidAuth`, `AuthenticatedRoute`
   - **Actual**: `SwissOIDAuthProvider`, `useSwissOIDAuth`, `AuthGuard`
   - Rationale: `AuthGuard` is more flexible than `AuthenticatedRoute`

3. **No Separate Apollo Client Factory**
   - **Plan**: `createSwissoidApolloClient` in the package
   - **Actual**: Apollo client remains in consuming apps (`clockize-react/src/utils/graphql.ts`)
   - Rationale: Apollo setup is app-specific; only `credentials: 'include'` is needed

4. **Backend Client Helper Added**
   - **Plan**: Not mentioned
   - **Actual**: `createSwissOIDBackendClient()` for imperative auth operations
   - Rationale: Allows non-React code to interact with backend

5. **Enhanced Features**
   - Session refresh support (`refreshSession()`)
   - Configurable polling intervals
   - Custom fetch implementation support
   - Transform user callback
   - Silent status checks
   - Proper cleanup and unmount handling

## Actual Exports

```typescript
// swissoid-front/src/index.ts
export {
  SwissOIDAuthProvider,
  useSwissOIDAuth,
} from './context/SwissOIDAuthContext';

export type {
  SwissOIDAuthConfig,
  SwissOIDAuthProviderProps,
  SwissOIDAuthContextValue,
  SwissOIDAuthEndpoints,
  FetchImplementation,
  LoginOptions,
  LogoutOptions,
} from './context/SwissOIDAuthContext';

export { AuthGuard } from './components/AuthGuard';
export { AuthDebugPanel } from './components/AuthDebugPanel';

export {
  createSwissOIDBackendClient,
} from './helpers/createBackendClient';

export { resolveUrl, appendQuery } from './utils/url';
```

## clockize-react Integration (Actual)

### App Setup

```typescript
// clockize-react/src/App.tsx
import { SwissOIDAuthProvider } from 'swissoid-front';
import AuthenticatedOrRedirect from './components/AuthenticatedOrRedirect';

const App: React.FC = () => (
  <SwissOIDAuthProvider
    backendUrl={import.meta.env.VITE_BACKEND_URL}
    pollIntervalMs={30_000}
  >
    <BrowserRouter>
      <Routes>
        <Route path="/workspace/*" element={
          <AuthenticatedOrRedirect>
            <WorkspacePage />
          </AuthenticatedOrRedirect>
        } />
        {/* More protected routes... */}
      </Routes>
    </BrowserRouter>
  </SwissOIDAuthProvider>
);
```

### Protected Route Component

```typescript
// clockize-react/src/components/AuthenticatedOrRedirect.tsx
import { AuthGuard } from 'swissoid-front';
import Loading from './Loading/Loading';

const AuthenticatedOrRedirect: React.FC<{ children: JSX.Element }> = ({ children }) => (
  <AuthGuard loadingFallback={<Loading />}>
    {children}
  </AuthGuard>
);
```

### Debug Page

```typescript
// clockize-react/src/pages/AuthDebugPage.tsx
import { AuthDebugPanel } from 'swissoid-front';

const AuthDebugPage: React.FC = () => (
  <div style={{ padding: '1.5rem' }}>
    <AuthDebugPanel />
  </div>
);
```

### Apollo Client Setup

```typescript
// clockize-react/src/utils/graphql.ts
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_ENDPOINT,
  credentials: 'include', // Send cookies with requests
});

export const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  connectToDevTools: true,
});
```

## Configuration Options

The actual implementation supports these configuration options:

```typescript
interface SwissOIDAuthConfig {
  backendUrl: string;                     // Required: Backend base URL
  endpoints?: {
    status?: string;                      // Default: '/auth/status'
    login?: string;                       // Default: '/login'
    logout?: string;                      // Default: '/auth/logout'
    refresh?: string;                     // Default: '/auth/refresh'
  };
  pollIntervalMs?: number | null;         // Default: 30000 (30s)
  fetchImplementation?: FetchImplementation;
  transformUser?: (user: unknown, raw: unknown) => unknown;
  loginRedirectParam?: string;            // Default: 'continue'
  logoutRedirectTo?: string | ((context) => void);
  initialUser?: unknown;                  // For SSR
  defaultHeaders?: HeadersInit;
  debugName?: string;
}
```

## AuthGuard Component Features

```typescript
interface AuthGuardProps {
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;            // Shown while checking auth
  unauthenticatedFallback?: React.ReactNode;    // Shown if not authenticated
  onUnauthenticated?: (context) => void;        // Custom handler
  triggerLoginOnUnauthenticated?: boolean;      // Default: true
}
```

## Hook Return Value

```typescript
interface SwissOIDAuthContextValue {
  user: unknown;
  authenticated: boolean;
  loading: boolean;
  error: Error | null;
  lastChecked: number | null;
  raw: unknown;                           // Full backend response
  backendUrl: string;
  endpoints: Required<SwissOIDAuthEndpoints>;
  checkAuthStatus: (options?: { silent?: boolean }) => Promise<void>;
  login: (options?: LoginOptions) => void;
  logout: (options?: LogoutOptions) => Promise<void>;
  refreshSession: () => Promise<void>;    // NEW: Not in original plan
}
```

## Dependencies

```json
{
  "dependencies": {
    "hooks-croco": "^1.1.6"  // For useInterval hook
  },
  "peerDependencies": {
    "react": ">=17.0.0",
    "react-dom": ">=17.0.0"
  }
}
```

Note: No Apollo Client dependency - kept in consuming apps.

## Migration Summary

### Code Removed from clockize-react
- Custom `LoginContext` provider ✅ (replaced by `SwissOIDAuthProvider`)
- Custom auth status polling logic ✅ (built into provider)
- Manual cookie parsing ✅ (handled by browser + backend)
- Custom protected route logic ✅ (replaced by `AuthGuard`)

### Code Kept in clockize-react
- Apollo Client setup (app-specific configuration)
- Route definitions (app-specific)
- UI components (Loading, PageNotFound, etc.)
- Business logic and GraphQL queries

## Success Metrics

| Metric | Target | Actual Status |
|--------|--------|---------------|
| Package published | ✅ | v0.1.4 published |
| clockize-react uses package | ✅ | Using `swissoid-front@^0.1.4` |
| Auth functionality preserved | ✅ | All features working |
| Code reduction | 80%+ | ~90% auth code removed |
| Zero breaking changes | ✅ | No regressions |

## Validation Checklist

- [x] `swissoid-front` package created and published
- [x] `SwissOIDAuthProvider` wraps app in `clockize-react`
- [x] `AuthGuard` protects routes
- [x] `AuthDebugPanel` available for debugging
- [x] Login flow works identically
- [x] Protected routes redirect when unauthenticated
- [x] GraphQL requests include credentials
- [x] Logout clears auth state
- [x] No auth logic remains in clockize-react (except wiring)
- [x] Clean TypeScript types exported
- [x] Good documentation in README

## Key Improvements Over Plan

1. **Better Polling**: Uses `useInterval` from `hooks-croco` with proper cleanup
2. **Silent Checks**: Background polling doesn't show loading state
3. **Session Refresh**: Explicit `refreshSession()` method
4. **Flexible Auth Guard**: `AuthGuard` supports custom fallbacks and handlers
5. **URL Utilities**: Extracted `resolveUrl` and `appendQuery` helpers
6. **Backend Client**: Imperative API for non-React contexts
7. **SSR Support**: `initialUser` prop for server-side rendering
8. **Proper Cleanup**: Uses refs to prevent state updates after unmount

## Next Phase Preview

Phase 4 will integrate swissoid-front into biblio-stats-react (if it exists), proving the frontend package works across different React applications just like the backend modules. If biblio-stats-react doesn't exist, Phase 4 can be skipped as clockize-react already validates the package's reusability.