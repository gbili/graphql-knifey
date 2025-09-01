import { LoadDictElement, GetInstanceType } from 'di-why/build/src/DiContainer';
import { SessionMetadata } from '../types/auth.types';

export interface SessionData {
  userId: string;
  metadata?: SessionMetadata;
  createdAt?: number;
  lastAccessedAt?: number;
}

export interface RefreshData {
  userId: string;
  sessionId?: string;
  metadata?: SessionMetadata;
  createdAt?: number;
}

export interface SessionConfig {
  sessionTTL: number;  // seconds
  refreshTTL: number;  // seconds
  prefix?: string;     // key prefix for storage
}

export interface SessionServiceInterface {
  create(userId: string, metadata?: SessionMetadata): Promise<{ sessionId: string; refreshId: string }>;
  validate(sessionId: string): Promise<SessionData | null>;
  refresh(refreshId: string): Promise<{ sessionId: string; refreshId: string } | null>;
  revoke(sessionId: string): Promise<void>;
  revokeRefresh(refreshId: string): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<void>;
  updateSessionMetadata(sessionId: string, metadata: SessionMetadata): Promise<boolean>;
}

export interface StorageInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  setex(key: string, seconds: number, value: string): Promise<void>;
  del(key: string | string[]): Promise<void>;
  keys(pattern: string): Promise<string[]>;
}

export class SessionService implements SessionServiceInterface {
  private prefix: string;

  constructor(
    private storage: StorageInterface,
    private uuid: () => string,
    private config: SessionConfig
  ) {
    this.prefix = config.prefix || '';
  }

  private getSessionKey(sessionId: string): string {
    return `${this.prefix}session:${sessionId}`;
  }

  private getRefreshKey(refreshId: string): string {
    return `${this.prefix}refresh:${refreshId}`;
  }

  private getUserSessionsKey(userId: string): string {
    return `${this.prefix}user:${userId}:sessions`;
  }

  async create(userId: string, metadata?: SessionMetadata): Promise<{ sessionId: string; refreshId: string }> {
    console.log('[SESSION DEBUG] SessionService.create called for user:', userId);
    const sessionId = this.uuid();
    const refreshId = this.uuid();
    const now = Date.now();
    
    console.log('[SESSION DEBUG] Generated sessionId:', sessionId);
    console.log('[SESSION DEBUG] Generated refreshId:', refreshId);
    console.log('[SESSION DEBUG] Session TTL:', this.config.sessionTTL, 'seconds');
    console.log('[SESSION DEBUG] Refresh TTL:', this.config.refreshTTL, 'seconds');
    
    const sessionData: SessionData = {
      userId,
      metadata,
      createdAt: now,
      lastAccessedAt: now,
    };
    
    const refreshData: RefreshData = {
      userId,
      sessionId,
      metadata,
      createdAt: now,
    };
    
    // Store session
    const sessionKey = this.getSessionKey(sessionId);
    console.log('[SESSION DEBUG] Storing session at key:', sessionKey);
    await this.storage.setex(
      sessionKey,
      this.config.sessionTTL,
      JSON.stringify(sessionData)
    );
    
    // Store refresh token
    const refreshKey = this.getRefreshKey(refreshId);
    console.log('[SESSION DEBUG] Storing refresh at key:', refreshKey);
    await this.storage.setex(
      refreshKey,
      this.config.refreshTTL,
      JSON.stringify(refreshData)
    );
    
    // Track user's sessions for bulk revocation
    const userSessionsKey = this.getUserSessionsKey(userId);
    await this.storage.setex(
      `${userSessionsKey}:${sessionId}`,
      this.config.sessionTTL,
      '1'
    );
    
    return { sessionId, refreshId };
  }

  async validate(sessionId: string): Promise<SessionData | null> {
    console.log('[SESSION DEBUG] SessionService.validate called with sessionId:', sessionId);
    if (!sessionId) {
      console.log('[SESSION DEBUG] No sessionId provided, returning null');
      return null;
    }
    
    const sessionKey = this.getSessionKey(sessionId);
    console.log('[SESSION DEBUG] Looking for session at key:', sessionKey);
    const data = await this.storage.get(sessionKey);
    
    if (!data) {
      console.log('[SESSION DEBUG] No session data found for sessionId:', sessionId);
      return null;
    }
    
    console.log('[SESSION DEBUG] Session data found, parsing...');
    try {
      const sessionData = JSON.parse(data) as SessionData;
      console.log('[SESSION DEBUG] Session valid for user:', sessionData.userId);
      
      // Update last accessed time
      sessionData.lastAccessedAt = Date.now();
      await this.storage.setex(
        this.getSessionKey(sessionId),
        this.config.sessionTTL,
        JSON.stringify(sessionData)
      );
      console.log('[SESSION DEBUG] Session refreshed with new TTL');
      
      return sessionData;
    } catch (err) {
      console.error('[SESSION DEBUG] Failed to parse session data:', err);
      return null;
    }
  }

  async refresh(refreshId: string): Promise<{ sessionId: string; refreshId: string } | null> {
    if (!refreshId) return null;
    
    const data = await this.storage.get(this.getRefreshKey(refreshId));
    if (!data) return null;
    
    try {
      const refreshData = JSON.parse(data) as RefreshData;
      
      // Revoke old refresh token
      await this.revokeRefresh(refreshId);
      
      // Revoke old session if exists
      if (refreshData.sessionId) {
        await this.revoke(refreshData.sessionId);
      }
      
      // Create new session
      return this.create(refreshData.userId, refreshData.metadata);
    } catch (err) {
      console.error('Failed to parse refresh data:', err);
      return null;
    }
  }

  async revoke(sessionId: string): Promise<void> {
    if (!sessionId) return;
    
    // Get session to find userId
    const data = await this.storage.get(this.getSessionKey(sessionId));
    if (data) {
      try {
        const sessionData = JSON.parse(data) as SessionData;
        // Remove from user's session list
        await this.storage.del(`${this.getUserSessionsKey(sessionData.userId)}:${sessionId}`);
      } catch (err) {
        console.error('Failed to clean user session tracking:', err);
      }
    }
    
    // Delete session
    await this.storage.del(this.getSessionKey(sessionId));
  }

  async revokeRefresh(refreshId: string): Promise<void> {
    if (!refreshId) return;
    await this.storage.del(this.getRefreshKey(refreshId));
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    // Find all user sessions
    const pattern = `${this.getUserSessionsKey(userId)}:*`;
    const userSessionKeys = await this.storage.keys(pattern);
    
    // Extract session IDs and revoke them
    const sessionIds = userSessionKeys.map(key => {
      const parts = key.split(':');
      return parts[parts.length - 1];
    });
    
    // Revoke all sessions
    await Promise.all(sessionIds.map(sid => this.revoke(sid)));
  }

  async updateSessionMetadata(sessionId: string, metadata: SessionMetadata): Promise<boolean> {
    const data = await this.storage.get(this.getSessionKey(sessionId));
    if (!data) return false;
    
    try {
      const sessionData = JSON.parse(data) as SessionData;
      sessionData.metadata = { ...sessionData.metadata, ...metadata };
      sessionData.lastAccessedAt = Date.now();
      
      await this.storage.setex(
        this.getSessionKey(sessionId),
        this.config.sessionTTL,
        JSON.stringify(sessionData)
      );
      
      return true;
    } catch (err) {
      console.error('Failed to update session metadata:', err);
      return false;
    }
  }
}

// Loader for DI
export const sessionServiceLDEGen = (config?: Partial<SessionConfig>): LoadDictElement<GetInstanceType<typeof SessionService>> => {
  const loadDictElement: LoadDictElement<GetInstanceType<typeof SessionService>> = {
    factory: ({ deps }) => {
      return new SessionService(
        deps.storage,
        deps.uuid,
        {
          sessionTTL: config?.sessionTTL || 7200,    // 2 hours default
          refreshTTL: config?.refreshTTL || 604800,  // 7 days default
          prefix: config?.prefix || '',
        }
      );
    },
    locateDeps: {
      storage: 'redisClient', // or 'memoryStore'
      uuid: 'uuid',
    }
  };
  return loadDictElement;
};

export default sessionServiceLDEGen;