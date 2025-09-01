import { Request, Response } from 'express';
import { AuthStrategy } from '../services/AuthStrategy';
import { SessionServiceInterface } from '../services/SessionService';
import { extractIPOrUndefined } from './plugIPAddressIntoContext';

export type AuthMode = 'cookie' | 'jwt' | 'hybrid';

export interface AuthContextParams {
  req: Request;
  res: Response;
  sessionId?: string | null;
  refreshId?: string | null;
  setAuthCookies?: (args: {
    sessionId?: string | null;
    refreshId?: string | null;
    sessionMaxAgeSec?: number;
    refreshMaxAgeSec?: number;
  }) => void;
  clearAuthCookies?: () => void;
}

export interface AuthContextDependencies {
  sharedContext: Record<string, any>;
  config: {
    authStrategy?: AuthStrategy;
    sessionService?: SessionServiceInterface;
    sessionAdapter?: any;
    authMode: AuthMode;
    sessionCookieName: string;
    refreshCookieName: string;
  };
}

export interface AuthContextResult {
  // Request/Response
  req: Request;
  res: Response;
  IP: string;

  // Cookie-based auth
  sessionId?: string | null;
  refreshId?: string | null;
  setAuthCookies: (args: {
    sessionId?: string | null;
    refreshId?: string | null;
    sessionMaxAgeSec?: number;
    refreshMaxAgeSec?: number;
  }) => void;
  clearAuthCookies: () => void;

  // Auth state
  authenticated: boolean;
  userId?: string;
  user?: any;

  // Services (optional, loaded if available)
  config: {
    authStrategy?: AuthStrategy;
    sessionService?: SessionServiceInterface;
    sessionAdapter?: any;
  }

  // Backward compatibility
  token?: string;

  // Any additional services passed in
  [key: string]: any;
}

/**
 * Creates the GraphQL context with authentication information
 * This is called for each GraphQL request
 */
export async function createAuthContext(
  params: AuthContextParams,
  {
    config,
    sharedContext
  }: AuthContextDependencies
): Promise<AuthContextResult> {
  const {
    req,
    res,
    sessionId: cookieSessionId,
    refreshId: cookieRefreshId,
    setAuthCookies,
    clearAuthCookies,
  } = params;

  // Extract IP address
  const IP = extractIPOrUndefined({ req }) || '';

  // Initialize auth context
  let authContext: Partial<AuthContextResult> = {
    authenticated: false,
  };

  // Handle authentication based on mode
  if (config.authMode === 'cookie' || config.authMode === 'hybrid') {
    // Try cookie-based auth
    const sessionId = cookieSessionId || req.cookies?.[config.sessionCookieName] || null;
    const refreshId = cookieRefreshId || req.cookies?.[config.refreshCookieName] || null;

    if (sessionId && config.sessionService) {
      try {
        const sessionData = await config.sessionService.validate(sessionId);
        if (sessionData) {
          authContext = {
            authenticated: true,
            userId: sessionData.userId,
            user: sessionData.metadata?.user,
            sessionId,
            refreshId,
            token: sessionId, // For backward compatibility
          };
        }
      } catch (err) {
        console.error('Session validation error:', err);
      }
    }

    // Fall back to JWT in hybrid mode if no session
    if (config.authMode === 'hybrid' && !authContext.authenticated) {
      const authHeader = req.headers?.authorization;
      const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : authHeader;

      if (token && config.authStrategy) {
        try {
          const validation = await config.authStrategy.validate(token as string);
          if (validation.valid) {
            authContext = {
              authenticated: true,
              userId: validation.userId,
              user: validation.user,
              token: token as string,
            };
          }
        } catch (err) {
          console.error('JWT validation error:', err);
        }
      }
    }
  } else if (config.authMode === 'jwt') {
    // JWT-only mode
    const authHeader = req.headers?.authorization;
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    if (token && config.authStrategy) {
      try {
        const validation = await config.authStrategy.validate(token as string);
        if (validation.valid) {
          authContext = {
            authenticated: true,
            userId: validation.userId,
            user: validation.user,
            token: token as string,
          };
        }
      } catch (err) {
        console.error('JWT validation error:', err);
      }
    }
  }

  // Build final context with all services and auth state
  return {
    // Request/Response
    req,
    res,
    IP,

    // Auth state
    authenticated: authContext.authenticated || false,
    userId: authContext.userId,
    user: authContext.user,

    // Cookie-based auth
    sessionId: authContext.sessionId || null,
    refreshId: authContext.refreshId || null,
    setAuthCookies: setAuthCookies || (() => {
      console.warn('setAuthCookies not available - using non-cookie Apollo server');
    }),
    clearAuthCookies: clearAuthCookies || (() => {
      console.warn('clearAuthCookies not available - using non-cookie Apollo server');
    }),

    // Backward compatibility
    token: authContext.token,

    // Trace of what config was used
    config,

    // All requested services
    ...sharedContext,
  };
}