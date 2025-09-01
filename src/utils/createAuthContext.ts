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

  console.log('[CONTEXT DEBUG] createAuthContext called');
  console.log('[CONTEXT DEBUG] Auth mode:', config.authMode);
  console.log('[CONTEXT DEBUG] Has sessionService:', !!config.sessionService);
  console.log('[CONTEXT DEBUG] Has authStrategy:', !!config.authStrategy);
  console.log('[CONTEXT DEBUG] Has sessionAdapter:', !!config.sessionAdapter);
  console.log('[CONTEXT DEBUG] Cookie names - session:', config.sessionCookieName, 'refresh:', config.refreshCookieName);
  console.log('[CONTEXT DEBUG] Request cookies:', req.cookies);
  console.log('[CONTEXT DEBUG] Has setAuthCookies:', !!setAuthCookies);
  console.log('[CONTEXT DEBUG] Has clearAuthCookies:', !!clearAuthCookies);

  // Extract IP address
  const IP = extractIPOrUndefined({ req }) || '';

  // Initialize auth context
  let authContext: Partial<AuthContextResult> = {
    authenticated: false,
  };

  // Handle authentication based on mode
  if (config.authMode === 'cookie' || config.authMode === 'hybrid') {
    console.log('[CONTEXT DEBUG] Attempting cookie-based auth');
    // Try cookie-based auth
    const sessionId = cookieSessionId || req.cookies?.[config.sessionCookieName] || null;
    const refreshId = cookieRefreshId || req.cookies?.[config.refreshCookieName] || null;
    
    console.log('[CONTEXT DEBUG] Session ID from params:', cookieSessionId);
    console.log('[CONTEXT DEBUG] Session ID from cookie:', req.cookies?.[config.sessionCookieName]);
    console.log('[CONTEXT DEBUG] Final sessionId:', sessionId);
    console.log('[CONTEXT DEBUG] Final refreshId:', refreshId);

    if (sessionId && config.sessionService) {
      console.log('[CONTEXT DEBUG] Validating session with sessionService');
      try {
        const sessionData = await config.sessionService.validate(sessionId);
        console.log('[CONTEXT DEBUG] Session validation result:', sessionData ? 'Valid session' : 'Invalid/expired session');
        if (sessionData) {
          authContext = {
            authenticated: true,
            userId: sessionData.userId,
            user: sessionData.metadata?.user,
            sessionId,
            refreshId,
            token: sessionId, // For backward compatibility
          };
          console.log('[CONTEXT DEBUG] User authenticated via session:', sessionData.userId);
        }
      } catch (err) {
        console.error('[CONTEXT DEBUG] Session validation error:', err);
      }
    } else {
      console.log('[CONTEXT DEBUG] No session to validate - sessionId:', !!sessionId, 'sessionService:', !!config.sessionService);
    }

    // Fall back to JWT in hybrid mode if no session
    if (config.authMode === 'hybrid' && !authContext.authenticated) {
      console.log('[CONTEXT DEBUG] Session auth failed, trying JWT fallback');
      const authHeader = req.headers?.authorization;
      const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : authHeader;
      
      console.log('[CONTEXT DEBUG] Auth header present:', !!authHeader);
      console.log('[CONTEXT DEBUG] Token extracted:', !!token);

      if (token && config.authStrategy) {
        console.log('[CONTEXT DEBUG] Validating JWT token');
        try {
          const validation = await config.authStrategy.validate(token as string);
          console.log('[CONTEXT DEBUG] JWT validation result:', validation.valid ? 'Valid' : 'Invalid');
          if (validation.valid) {
            authContext = {
              authenticated: true,
              userId: validation.userId,
              user: validation.user,
              token: token as string,
            };
            console.log('[CONTEXT DEBUG] User authenticated via JWT:', validation.userId);
          }
        } catch (err) {
          console.error('[CONTEXT DEBUG] JWT validation error:', err);
        }
      } else {
        console.log('[CONTEXT DEBUG] No JWT to validate - token:', !!token, 'authStrategy:', !!config.authStrategy);
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

  console.log('[CONTEXT DEBUG] Final auth state - authenticated:', authContext.authenticated || false);
  console.log('[CONTEXT DEBUG] Final auth state - userId:', authContext.userId);
  console.log('[CONTEXT DEBUG] Final auth state - has sessionId:', !!authContext.sessionId);
  console.log('[CONTEXT DEBUG] Final auth state - has token:', !!authContext.token);

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