import { SessionServiceInterface } from './SessionService';
import { LoadDictElement, GetInstanceType } from 'di-why/build/src/DiContainer';

// Status values that match existing code expectations
export enum ActionStatus {
  success = 'success',
  fail = 'fail',
  error = 'error',
}

export interface TokenAuthResponse {
  status: ActionStatus;
  code?: string;
  message?: string;
  user?: {
    UUID: string;
    [key: string]: any;
  };
  token?: string;
}

// Adapter to make session-based auth work with JWT-expecting code
export class SessionToJWTAdapter {
  constructor(
    private sessionService: SessionServiceInterface,
    private jwtService?: any // jwt-authorized service (optional for migration)
  ) {}

  // Make session look like a JWT for existing code
  async authenticateTokenStrategy({
    token,
    IP,
    tokenConfig
  }: {
    token: string;
    IP?: string;
    tokenConfig?: any;
  }): Promise<TokenAuthResponse> {
    // Check if it's actually a JWT or a session ID
    if (this.isJWT(token)) {
      // It's a JWT, use the JWT service if available
      if (this.jwtService) {
        try {
          const tokenUser = await this.jwtService.authenticateTokenStrategy({ token, tokenConfig: tokenConfig || {} });
          return {
            status: ActionStatus.success,
            user: {
              UUID: tokenUser.userInfo.UUID,
              ...tokenUser.userInfo,
            },
          };
        } catch (error: any) {
          return {
            status: ActionStatus.fail,
            code: 'INVALID_TOKEN',
            message: error.message || 'Invalid token',
          };
        }
      } else {
        return {
          status: ActionStatus.fail,
          code: 'JWT_NOT_SUPPORTED',
          message: 'JWT authentication not configured',
        };
      }
    }

    // It's a session ID
    const session = await this.sessionService.validate(token);

    if (!session) {
      return {
        status: ActionStatus.fail,
        code: 'INVALID_SESSION',
        message: 'Invalid or expired session',
      };
    }

    // Return jwt-authorized compatible response
    return {
      status: ActionStatus.success,
      user: {
        UUID: session.userId,
        ...session.metadata,
      },
    };
  }

  // Generate a token that looks like JWT but is actually a session
  async generateToken({
    UUID,
    ...metadata
  }: {
    UUID: string;
    [key: string]: any;
  }): Promise<string> {
    const { sessionId } = await this.sessionService.create(UUID, metadata);
    return sessionId;
  }

  // Verify token (session or JWT)
  async verifyToken<P = any>({
    token,
    tokenConfig
  }: {
    token: string;
    tokenConfig?: any;
  }): Promise<P | false> {
    if (this.isJWT(token)) {
      // Verify JWT
      if (this.jwtService) {
        try {
          return await this.jwtService.verifyToken({ token, tokenConfig: tokenConfig || {} });
        } catch {
          return false;
        }
      }
      return false;
    }

    // Verify session
    const session = await this.sessionService.validate(token);
    if (!session) {
      return false;
    }

    // Return JWT-like payload
    return {
      UUID: session.userId,
      aud: 'session',
      exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
      iat: Math.floor((session.createdAt || Date.now()) / 1000),
      ...session.metadata,
    } as P;
  }

  // Convert JWT auth to session
  async convertJWTToSession(jwtToken: string): Promise<{ sessionId: string; refreshId: string } | null> {
    if (!this.jwtService) {
      return null;
    }

    try {
      const payload = await this.jwtService.verifyToken({ token: jwtToken, tokenConfig: {} });
      if (payload && payload.UUID) {
        return await this.sessionService.create(payload.UUID, payload);
      }
    } catch (error) {
      console.error('Failed to convert JWT to session:', error);
      return null;
    }
    return null;
  }

  // Convert session to JWT (for clients still expecting JWT)
  async convertSessionToJWT(sessionId: string): Promise<string | null> {
    if (!this.jwtService) {
      return null;
    }

    const session = await this.sessionService.validate(sessionId);
    if (!session) {
      return null;
    }

    try {
      return await this.jwtService.generateToken({
        UUID: session.userId,
        ...session.metadata,
      });
    } catch (error) {
      console.error('Failed to convert session to JWT:', error);
      return null;
    }
  }

  // Blacklist/revoke token
  async blacklistToken(token: string): Promise<void> {
    if (this.isJWT(token)) {
      // Blacklist JWT if service supports it
      if (this.jwtService?.blacklistToken) {
        await this.jwtService.blacklistToken(token);
      }
    } else {
      // Revoke session
      await this.sessionService.revoke(token);
    }
  }

  // Check if a string is a JWT
  private isJWT(token: string): boolean {
    return typeof token === 'string' && token.split('.').length === 3;
  }
}

// Wrapper to make existing auth service work with sessions
export class AuthServiceAdapter {
  constructor(
    private authService: any, // Your existing AuthService
    private sessionService: SessionServiceInterface,
    private jwtService?: any // Optional for hybrid mode
  ) {}

  // Wrap existing authenticate to return sessions instead of JWT
  async authenticate(params: any): Promise<any> {
    // Call original authenticate
    const result = await this.authService.authenticate(params);

    if (result.status === ActionStatus.success && result.token) {
      // Convert JWT to session
      if (this.isJWT(result.token)) {
        // Extract user info from token
        const payload = await this.jwtService?.verifyToken({
          token: result.token,
          tokenConfig: {}
        });

        if (payload && payload.UUID) {
          // Create session
          const { sessionId, refreshId } = await this.sessionService.create(
            payload.UUID,
            { user: result.user, ...payload }
          );

          // Replace token with session info
          return {
            ...result,
            sessionId,
            refreshId,
            token: undefined, // Remove JWT from response
          };
        }
      }
    }

    return result;
  }

  // New method for session-based authentication
  async authenticateWithSession(params: any): Promise<any> {
    // Use existing password validation
    const result = await this.authService.authenticate(params);

    if (result.status === ActionStatus.success) {
      // Create session instead of JWT
      const { sessionId, refreshId } = await this.sessionService.create(
        result.user.UUID,
        { user: result.user }
      );

      return {
        ...result,
        sessionId,
        refreshId,
        token: undefined,
      };
    }

    return result;
  }

  // Make auth service validate sessions as if they were tokens
  async authenticateTokenStrategy(params: { token: string; IP?: string }): Promise<any> {
    const { token } = params;

    // Check if it's a session ID or JWT
    if (!this.isJWT(token)) {
      // It's a session ID
      const session = await this.sessionService.validate(token);

      if (!session) {
        return {
          status: ActionStatus.fail,
          code: 'INVALID_SESSION',
          message: 'Invalid or expired session',
        };
      }

      return {
        status: ActionStatus.success,
        user: {
          UUID: session.userId,
          ...session.metadata?.user,
        },
      };
    }

    // It's a JWT, use original method
    return this.authService.authenticateTokenStrategy(params);
  }

  private isJWT(token: string): boolean {
    return typeof token === 'string' && token.split('.').length === 3;
  }
}

// Loader for DI
export const sessionToJWTAdapterLDEGen = (): LoadDictElement<GetInstanceType<typeof SessionToJWTAdapter>> => ({
  constructible: SessionToJWTAdapter,
  destructureDeps: true,
  locateDeps: {
    sessionService: 'sessionService',
    jwtService: 'tokenAuthService', // Optional
  },
  before: async ({ deps }) => {
    // Return array for positional constructor arguments
    return [deps.sessionService, deps.jwtService];
  }
});

export const authServiceAdapterLDEGen = (): LoadDictElement<GetInstanceType<typeof AuthServiceAdapter>> => ({
  constructible: AuthServiceAdapter,
  destructureDeps: true,
  locateDeps: {
    authService: 'authService',
    sessionService: 'sessionService',
    jwtService: 'tokenAuthService', // Optional
  },
  before: async ({ deps }) => {
    // Return array for positional constructor arguments
    return [deps.authService, deps.sessionService, deps.jwtService];
  }
});