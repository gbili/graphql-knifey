import jwt from 'jsonwebtoken';

/**
 * Downstream Auth Token (DAT) Claims
 * Minimal payload - only what subgraphs need
 */
export interface DATClaims {
  sub: string;      // User ID (internal UUID)
  email?: string;
  roles?: string[];
  scopes?: string[];
  sessionId?: string;
}

/**
 * DAT Auth Minter Service Configuration
 */
export interface DATAuthMinterServiceConfig {
  privateKey: string;
  publicKey: string;
  algorithm: string;
  ttl: number;        // TTL in seconds
  issuer: string;     // e.g., 'cronide-gateway'
  audience: string;   // e.g., 'cronide-subgraphs'
}

/**
 * DATAuthMinterService - Mints short-lived internal tokens for gateway-to-subgraph communication
 *
 * Counterpart to DATAuthService (which validates DATs)
 * Phase 6: Gateway validates session cookies and mints DATs
 * Phase 7: Subgraphs validate DATs instead of SwissOID JWTs
 */
export class DATAuthMinterService {
  private privateKey: string;
  private publicKey: string;
  private config: DATAuthMinterServiceConfig;

  constructor(config: DATAuthMinterServiceConfig) {
    this.config = config;
    this.privateKey = config.privateKey;
    this.publicKey = config.publicKey;
  }

  /**
   * Mint a new DAT with short TTL
   */
  async mint(claims: DATClaims): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      ...claims,
      iss: this.config.issuer,
      aud: this.config.audience,
      iat: now,
      exp: now + this.config.ttl,
    };

    return jwt.sign(payload, this.privateKey, {
      algorithm: this.config.algorithm as jwt.Algorithm,
    });
  }

  /**
   * Get public key for distribution to subgraphs
   * Subgraphs will use this to validate DATs
   */
  getPublicKey(): string {
    return this.publicKey;
  }
}
