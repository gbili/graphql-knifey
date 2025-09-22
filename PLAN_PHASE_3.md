# Phase 3: Extract Frontend Auth (swissoid-front)

## Objective
Extract all authentication-related React components, hooks, and utilities from clockize-react into a reusable `swissoid-front` package, while maintaining clockize-react's current functionality.

## Prerequisites
- Phase 1 & 2 completed: Backend auth modules working in swissoid-back package
- New npm package created: `swissoid-front`
- clockize-react still functional (even with broken backend state)

## Current State of clockize-react

### What It Has Now

#### 1. Authentication Components
**Location:** `clockize-react/src/components/`
- `AuthenticatedOrRedirect.tsx` - Protected route wrapper
- `Loading.tsx` - Loading state during auth check

#### 2. Login Context
**Location:** `clockize-react/src/contexts/LoginContext.tsx`
- Complex context provider with auth state
- Login/logout reducers
- Auth status polling
- User state management

#### 3. Auth Utilities
**Location:** `clockize-react/src/utils/`
- `oidc.ts` - Helper functions for auth operations
- `graphql.ts` - Apollo client with credentials configuration

#### 4. Auth Debug Page
**Location:** `clockize-react/src/pages/AuthDebugPage.tsx`
- Debug component for testing auth flow
- Cookie inspection
- Manual auth status checking

## Package Structure for swissoid-front

```
swissoid-front/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Main exports
│   ├── providers/
│   │   ├── AuthProvider.tsx        # Main auth context provider
│   │   └── types.ts
│   ├── hooks/
│   │   ├── useAuth.ts              # Primary auth hook
│   │   ├── useAuthStatus.ts        # Status checking hook
│   │   ├── useProtectedRoute.ts    # Route protection hook
│   │   └── index.ts
│   ├── components/
│   │   ├── AuthenticatedRoute.tsx  # Protected route component
│   │   ├── AuthGuard.tsx           # Flexible auth wrapper
│   │   ├── AuthDebug.tsx           # Debug component
│   │   └── index.ts
│   ├── clients/
│   │   ├── apollo.ts               # Apollo client factory
│   │   ├── fetch.ts                # Fetch wrapper with credentials
│   │   └── index.ts
│   ├── utils/
│   │   ├── cookies.ts              # Cookie helpers (read-only)
│   │   ├── storage.ts              # Local storage helpers
│   │   ├── redirect.ts             # Login/logout redirects
│   │   └── index.ts
│   └── types/
│       └── auth.types.ts           # Shared TypeScript types
├── dist/                            # Built output
└── README.md                        # Documentation
```

## Extraction Plan

### Step 1: Create swissoid-front Package

```bash
# Create new package
mkdir ../swissoid-front
cd ../swissoid-front
npm init -y

# Update package.json
{
  "name": "swissoid-front",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-router-dom": "^6.0.0"
  },
  "dependencies": {
    "@apollo/client": "^3.7.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@testing-library/react": "^14.0.0"
  }
}
```

### Step 2: Extract AuthProvider

```typescript
// swissoid-front/src/providers/AuthProvider.tsx
import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';

export interface User {
  UUID: string;
  email?: string;
  username?: string;
  [key: string]: any;
}

export interface AuthState {
  user: User | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface AuthConfig {
  backendUrl: string;
  authStatusEndpoint?: string;
  loginEndpoint?: string;
  logoutEndpoint?: string;
  pollInterval?: number;
  debug?: boolean;
}

const AuthContext = createContext<{
  state: AuthState;
  actions: {
    checkAuth: () => Promise<void>;
    login: () => void;
    logout: () => Promise<void>;
    setUser: (user: User | null) => void;
  };
} | null>(null);

export const SwissoidAuthProvider: React.FC<{
  config: AuthConfig;
  children: React.ReactNode;
}> = ({ config, children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    authenticated: false,
    loading: true,
    error: null,
  });

  const checkAuth = async () => {
    const statusUrl = `${config.backendUrl}${config.authStatusEndpoint || '/auth/status'}`;

    try {
      const response = await fetch(statusUrl, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Auth check failed: ${response.status}`);
      }

      const data = await response.json();

      dispatch({
        type: 'AUTH_CHECK_SUCCESS',
        payload: {
          authenticated: data.authenticated,
          user: data.user,
        },
      });
    } catch (error) {
      dispatch({
        type: 'AUTH_CHECK_FAILURE',
        payload: error.message,
      });
    }
  };

  const login = () => {
    const loginUrl = `${config.backendUrl}${config.loginEndpoint || '/login'}`;
    window.location.href = loginUrl;
  };

  const logout = async () => {
    const logoutUrl = `${config.backendUrl}${config.logoutEndpoint || '/auth/logout'}`;

    try {
      await fetch(logoutUrl, {
        method: 'POST',
        credentials: 'include',
      });

      dispatch({ type: 'LOGOUT' });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const setUser = (user: User | null) => {
    dispatch({
      type: 'SET_USER',
      payload: user,
    });
  };

  // Initial auth check
  useEffect(() => {
    checkAuth();
  }, []);

  // Optional polling
  useEffect(() => {
    if (config.pollInterval && config.pollInterval > 0) {
      const interval = setInterval(checkAuth, config.pollInterval);
      return () => clearInterval(interval);
    }
  }, [config.pollInterval]);

  const value = {
    state,
    actions: {
      checkAuth,
      login,
      logout,
      setUser,
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Auth reducer
function authReducer(state: AuthState, action: any): AuthState {
  switch (action.type) {
    case 'AUTH_CHECK_SUCCESS':
      return {
        ...state,
        authenticated: action.payload.authenticated,
        user: action.payload.user,
        loading: false,
        error: null,
      };
    case 'AUTH_CHECK_FAILURE':
      return {
        ...state,
        authenticated: false,
        user: null,
        loading: false,
        error: action.payload,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        authenticated: !!action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        authenticated: false,
        user: null,
      };
    default:
      return state;
  }
}

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within SwissoidAuthProvider');
  }
  return context;
};
```

### Step 3: Create Primary Hook

```typescript
// swissoid-front/src/hooks/useAuth.ts
import { useAuthContext } from '../providers/AuthProvider';

export interface UseAuthReturn {
  // State
  user: any | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  login: () => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: any | null) => void;
}

export const useSwissoidAuth = (): UseAuthReturn => {
  const { state, actions } = useAuthContext();

  return {
    // State
    user: state.user,
    authenticated: state.authenticated,
    loading: state.loading,
    error: state.error,

    // Actions
    login: actions.login,
    logout: actions.logout,
    checkAuth: actions.checkAuth,
    setUser: actions.setUser,
  };
};

// Convenience hooks
export const useUser = () => {
  const { user } = useSwissoidAuth();
  return user;
};

export const useAuthenticated = () => {
  const { authenticated } = useSwissoidAuth();
  return authenticated;
};
```

### Step 4: Create Protected Route Component

```typescript
// swissoid-front/src/components/AuthenticatedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSwissoidAuth } from '../hooks/useAuth';

export interface AuthenticatedRouteProps {
  children: React.ReactElement;
  redirectTo?: string;
  fallback?: React.ReactElement;
}

export const AuthenticatedRoute: React.FC<AuthenticatedRouteProps> = ({
  children,
  redirectTo,
  fallback,
}) => {
  const { authenticated, loading, login } = useSwissoidAuth();

  // Still loading
  if (loading) {
    return fallback || <div>Loading...</div>;
  }

  // Not authenticated
  if (!authenticated) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    // Redirect to login
    login();
    return null;
  }

  // Authenticated
  return children;
};

// Alternative with render prop pattern
export const AuthGuard: React.FC<{
  children: (auth: { user: any; logout: () => void }) => React.ReactElement;
  fallback?: React.ReactElement;
}> = ({ children, fallback }) => {
  const { authenticated, user, logout, loading } = useSwissoidAuth();

  if (loading) {
    return fallback || <div>Loading...</div>;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return children({ user, logout });
};
```

### Step 5: Create Apollo Client Factory

```typescript
// swissoid-front/src/clients/apollo.ts
import { ApolloClient, InMemoryCache, createHttpLink, ApolloClientOptions, NormalizedCacheObject } from '@apollo/client';

export interface CreateApolloClientConfig {
  graphqlUrl: string;
  cache?: InMemoryCache;
  additionalOptions?: Partial<ApolloClientOptions<NormalizedCacheObject>>;
}

export const createSwissoidApolloClient = ({
  graphqlUrl,
  cache,
  additionalOptions = {},
}: CreateApolloClientConfig): ApolloClient<NormalizedCacheObject> => {
  const httpLink = createHttpLink({
    uri: graphqlUrl,
    credentials: 'include', // Always send cookies
  });

  return new ApolloClient({
    link: httpLink,
    cache: cache || new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'network-only',
      },
      query: {
        fetchPolicy: 'network-only',
      },
    },
    ...additionalOptions,
  });
};

// Convenience wrapper for fetch with credentials
export const authenticatedFetch = (url: string, options: RequestInit = {}) => {
  return fetch(url, {
    ...options,
    credentials: 'include',
  });
};
```

### Step 6: Create Debug Component

```typescript
// swissoid-front/src/components/AuthDebug.tsx
import React, { useState } from 'react';
import { useSwissoidAuth } from '../hooks/useAuth';

export const SwissoidAuthDebug: React.FC = () => {
  const { user, authenticated, loading, error, checkAuth, login, logout } = useSwissoidAuth();
  const [cookies, setCookies] = useState(document.cookie);

  const refreshCookies = () => {
    setCookies(document.cookie);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>🔐 SwissOID Auth Debug</h2>

      <div style={{ marginBottom: '20px' }}>
        <h3>Auth State</h3>
        <pre style={{ background: '#f4f4f4', padding: '10px' }}>
          {JSON.stringify(
            {
              authenticated,
              loading,
              error,
              user,
            },
            null,
            2
          )}
        </pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Browser Cookies</h3>
        <button onClick={refreshCookies}>🔄 Refresh</button>
        <pre style={{ background: '#f4f4f4', padding: '10px' }}>
          {cookies || 'No cookies found'}
        </pre>
      </div>

      <div>
        <h3>Actions</h3>
        <button onClick={checkAuth} style={{ marginRight: '10px' }}>
          Check Auth
        </button>
        <button onClick={login} style={{ marginRight: '10px' }}>
          Login
        </button>
        <button onClick={logout} style={{ marginRight: '10px' }}>
          Logout
        </button>
      </div>
    </div>
  );
};
```

### Step 7: Main Package Exports

```typescript
// swissoid-front/src/index.ts

// Providers
export { SwissoidAuthProvider } from './providers/AuthProvider';
export type { AuthConfig, AuthState, User } from './providers/AuthProvider';

// Hooks
export {
  useSwissoidAuth,
  useUser,
  useAuthenticated
} from './hooks/useAuth';

// Components
export { AuthenticatedRoute } from './components/AuthenticatedRoute';
export { AuthGuard } from './components/AuthenticatedRoute';
export { SwissoidAuthDebug } from './components/AuthDebug';

// Clients
export {
  createSwissoidApolloClient,
  authenticatedFetch
} from './clients/apollo';
export type { CreateApolloClientConfig } from './clients/apollo';
```

### Step 8: Update clockize-react to Use swissoid-front

```typescript
// clockize-react/package.json
{
  "dependencies": {
    "swissoid-front": "^1.0.0"  // or "file:../swissoid-front" for local
  }
}
```

```typescript
// clockize-react/src/App.tsx
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import {
  SwissoidAuthProvider,
  createSwissoidApolloClient
} from 'swissoid-front';

const apolloClient = createSwissoidApolloClient({
  graphqlUrl: import.meta.env.VITE_ENDPOINT,
});

const authConfig = {
  backendUrl: import.meta.env.VITE_BACKEND_URL,
  pollInterval: 5 * 60 * 1000, // Check auth every 5 minutes
};

function App() {
  return (
    <BrowserRouter>
      <SwissoidAuthProvider config={authConfig}>
        <ApolloProvider client={apolloClient}>
          <Routes>
            {/* Your routes */}
          </Routes>
        </ApolloProvider>
      </SwissoidAuthProvider>
    </BrowserRouter>
  );
}
```

```typescript
// clockize-react/src/components/AuthenticatedOrRedirect.tsx
// REPLACE with:
import { AuthenticatedRoute } from 'swissoid-front';

export default AuthenticatedRoute; // Direct export
```

```typescript
// clockize-react/src/contexts/LoginContext.tsx
// DELETE - replaced by SwissoidAuthProvider

// clockize-react/src/utils/oidc.ts
// DELETE - functionality moved to swissoid-front
```

## Testing Plan

### Unit Tests for swissoid-front

```typescript
// swissoid-front/src/__tests__/AuthProvider.test.tsx
describe('SwissoidAuthProvider', () => {
  it('should check auth on mount', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ authenticated: true, user: { UUID: '123' } }),
    });
    global.fetch = mockFetch;

    render(
      <SwissoidAuthProvider config={{ backendUrl: 'http://test' }}>
        <TestComponent />
      </SwissoidAuthProvider>
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test/auth/status',
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });
  });
});
```

### Integration Testing in clockize-react

```typescript
// clockize-react/src/__tests__/auth.integration.test.tsx
describe('Auth Integration with swissoid-front', () => {
  it('should protect routes', async () => {
    render(
      <SwissoidAuthProvider config={{ backendUrl: 'http://test' }}>
        <AuthenticatedRoute>
          <div>Protected Content</div>
        </AuthenticatedRoute>
      </SwissoidAuthProvider>
    );

    // Should show loading initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // After auth check fails, should redirect
    await waitFor(() => {
      expect(window.location.href).toContain('/login');
    });
  });
});
```

## Migration Guide for clockize-react

### Before (Custom Implementation):
```tsx
// Complex custom LoginContext
// Custom AuthenticatedOrRedirect
// Manual fetch with credentials
// Custom Apollo setup
```

### After (Using swissoid-front):
```tsx
import {
  SwissoidAuthProvider,
  AuthenticatedRoute,
  useSwissoidAuth,
  createSwissoidApolloClient
} from 'swissoid-front';

// Clean, reusable components
```

## Validation Criteria

### Functionality Preserved
- [ ] Login flow works identically
- [ ] Auth status checking works
- [ ] Protected routes redirect when unauthenticated
- [ ] GraphQL requests include credentials
- [ ] Logout clears auth state

### Code Quality
- [ ] No auth logic remains in clockize-react
- [ ] All auth handled by swissoid-front
- [ ] Clean component interfaces
- [ ] Proper TypeScript types

### Developer Experience
- [ ] Simple API surface
- [ ] Good documentation
- [ ] Helpful error messages
- [ ] Easy debugging with AuthDebug component

## Success Metrics

1. **Line Count Reduction:** clockize-react auth code reduced by 80%+
2. **Reusability:** Package works without modification in any React app
3. **Zero Breaking Changes:** clockize-react works exactly as before
4. **Developer Friendly:** Can integrate in < 10 minutes

## Package Publishing

```bash
# Build the package
cd swissoid-front
npm run build

# Test locally
npm link

# In clockize-react
npm link swissoid-front

# When ready to publish
npm publish --access public
```

## Next Phase Preview

Phase 4 will integrate swissoid-front into biblio-stats-react, proving the frontend package works across different React applications just like the backend modules.