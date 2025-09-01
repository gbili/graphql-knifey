import type { Response } from 'express';

// --- Helper: set/clear cookie with correct attributes ---------------
export function makeCookieHelpers(
  res: Response,
  {
    isProd,
    domain,
    accessName,
    refreshName,
  }: { isProd: boolean; domain?: string; accessName: string; refreshName: string }
) {
  const base = {
    httpOnly: true,
    sameSite: isProd ? 'none' as const : ('lax' as const), // 'none' for cross-site in prod
    secure: isProd,                                        // Chrome requires Secure when SameSite=None
    path: '/',
    domain,                                                // can be undefined in dev
  };

  const setAuthCookies = ({
    sessionId,
    refreshId,
    sessionMaxAgeSec = 60 * 60 * 2,      // 2h default
    refreshMaxAgeSec = 60 * 60 * 24 * 7, // 7d default
  }: {
    sessionId?: string | null;
    refreshId?: string | null;
    sessionMaxAgeSec?: number;
    refreshMaxAgeSec?: number;
  }) => {
    console.log('[COOKIE DEBUG] setAuthCookies called');
    console.log('[COOKIE DEBUG] sessionId provided:', !!sessionId);
    console.log('[COOKIE DEBUG] refreshId provided:', !!refreshId);
    console.log('[COOKIE DEBUG] Cookie base options:', base);
    
    if (sessionId != null) {
      const sessionOptions = { ...base, maxAge: sessionMaxAgeSec * 1000 };
      console.log('[COOKIE DEBUG] Setting session cookie:', accessName, 'with options:', sessionOptions);
      res.cookie(accessName, sessionId, sessionOptions);
      console.log('[COOKIE DEBUG] Session cookie set');
      console.log('[COOKIE DEBUG] Response headers after setting:', res.getHeaders());
    }
    if (refreshId != null) {
      // typically longer-lived than session
      const refreshOptions = { ...base, maxAge: refreshMaxAgeSec * 1000 };
      console.log('[COOKIE DEBUG] Setting refresh cookie:', refreshName, 'with options:', refreshOptions);
      res.cookie(refreshName, refreshId, refreshOptions);
      console.log('[COOKIE DEBUG] Refresh cookie set');
    }
    
    if (!sessionId && !refreshId) {
      console.log('[COOKIE DEBUG] WARNING: setAuthCookies called but no IDs provided!');
    }
  };

  const clearAuthCookies = () => {
    console.log('[COOKIE DEBUG] clearAuthCookies called');
    console.log('[COOKIE DEBUG] Clearing cookie:', accessName);
    res.clearCookie(accessName, { ...base, maxAge: undefined });
    console.log('[COOKIE DEBUG] Clearing cookie:', refreshName);
    res.clearCookie(refreshName, { ...base, maxAge: undefined });
    console.log('[COOKIE DEBUG] Cookies cleared');
  };

  return { setAuthCookies, clearAuthCookies };
}
