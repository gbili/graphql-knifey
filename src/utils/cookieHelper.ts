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
    if (sessionId != null) {
      res.cookie(accessName, sessionId, { ...base, maxAge: sessionMaxAgeSec * 1000 });
    }
    if (refreshId != null) {
      // typically longer-lived than session
      res.cookie(refreshName, refreshId, { ...base, maxAge: refreshMaxAgeSec * 1000 });
    }
  };

  const clearAuthCookies = () => {
    res.clearCookie(accessName, { ...base, maxAge: undefined });
    res.clearCookie(refreshName, { ...base, maxAge: undefined });
  };

  return { setAuthCookies, clearAuthCookies };
}
