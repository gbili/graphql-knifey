import jwt from 'jsonwebtoken';

/**
 * DAT (Downstream Auth Token) payload from gateway
 */
export interface DATPayload {
  sub: string;        // User UUID
  email?: string;
  roles?: string[];
  scopes?: string[];
  sessionId?: string;
  iss: string;        // Issuer (should be 'cronide-gateway')
  aud: string;        // Audience (should be 'cronide-subgraphs')
  iat: number;
  exp: number;
}

export interface DATAuthServiceConfig {
  publicKey: string;
  algorithm: string;
  issuer: string;      // Expected issuer: 'cronide-gateway'
  audience: string;    // Expected audience: 'cronide-subgraphs'
}

/**
 * DATAuthService - Validates DATs minted by the gateway
 *
 * Phase 7: Subgraphs validate DATs instead of SwissOID JWTs
 */
export class DATAuthService {
  private config: DATAuthServiceConfig;

  constructor(config: DATAuthServiceConfig) {
    this.config = config;
  }

  /**
   * Verify and decode a DAT
   * Returns the payload if valid, null if invalid
   */
  verifyToken(token: string): DATPayload | null {
    try {
      const payload = jwt.verify(token, this.config.publicKey, {
        algorithms: [this.config.algorithm as jwt.Algorithm],
        issuer: this.config.issuer,
        audience: this.config.audience,
      }) as DATPayload;

      return payload;
    } catch (error) {
      console.error('[DAT Auth] Token verification failed:', error);
      return null;
    }
  }

  /**
   * Extract user info from DAT payload
   */
  getUserFromPayload(payload: DATPayload) {
    return {
      UUID: payload.sub,
      email: payload.email,
      roles: payload.roles || [],
      scopes: payload.scopes || [],
    };
  }
}
