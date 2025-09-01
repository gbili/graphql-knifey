import { SessionServiceInterface } from './SessionService';
import { LoadDictElement, GetInstanceType } from 'di-why/build/src/DiContainer';

export interface AuthResult {
  success: boolean;
  status?: string;
  code?: string;
  message?: string;
  userId?: string;
  user?: any;
  token?: string;
  sessionId?: string;
  refreshId?: string;
  metadata?: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  userId?: string;
  user?: any;
  metadata?: Record<string, any>;
  sessionData?: any;
}

export interface AuthCredentials {
  username?: string;
  email?: string;
  password?: string;
  [key: string]: any;
}

export interface AuthStrategy<T = AuthCredentials> {
  authenticate(credentials: T): Promise<AuthResult>;
  validate(tokenOrSessionId: string): Promise<ValidationResult>;
  revoke(tokenOrSessionId: string): Promise<void>;
  refresh?(refreshToken: string): Promise<AuthResult>;
}

// User validator function type
export type UserValidator<T = AuthCredentials> = (credentials: T) => Promise<{ userId: string; user?: any } | null>;

// Cookie-based session strategy
export class CookieSessionStrategy implements AuthStrategy {
  constructor(
    private sessionService: SessionServiceInterface,
    private userValidator: UserValidator
  ) {}

  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      const validationResult = await this.userValidator(credentials);

      if (!validationResult) {
        return {
          success: false,
          status: 'fail',
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials provided',
        };
      }

      const { sessionId, refreshId } = await this.sessionService.create(
        validationResult.userId,
        { user: validationResult.user }
      );

      return {
        success: true,
        status: 'success',
        code: 'LOGIN_SUCCESS',
        message: 'Authentication successful',
        userId: validationResult.userId,
        user: validationResult.user,
        sessionId,
        refreshId,
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        status: 'error',
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      };
    }
  }

  async validate(sessionId: string): Promise<ValidationResult> {
    const session = await this.sessionService.validate(sessionId);

    if (!session) {
      return { valid: false };
    }

    return {
      valid: true,
      userId: session.userId,
      user: session.metadata?.user,
      metadata: session.metadata,
      sessionData: session,
    };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.sessionService.revoke(sessionId);
  }

  async refresh(refreshId: string): Promise<AuthResult> {
    const result = await this.sessionService.refresh(refreshId);

    if (!result) {
      return {
        success: false,
        status: 'fail',
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
      };
    }

    return {
      success: true,
      status: 'success',
      code: 'REFRESH_SUCCESS',
      message: 'Session refreshed successfully',
      sessionId: result.sessionId,
      refreshId: result.refreshId,
    };
  }
}

// JWT strategy for backward compatibility
export class JWTStrategy implements AuthStrategy {
  constructor(
    private tokenAuthService: any, // jwt-authorized service
    private userValidator: UserValidator
  ) {}

  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      const validationResult = await this.userValidator(credentials);

      if (!validationResult) {
        return {
          success: false,
          status: 'fail',
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials provided',
        };
      }

      // Generate JWT token
      const token = await this.tokenAuthService.generateToken({
        UUID: validationResult.userId,
        ...validationResult.user,
      });

      return {
        success: true,
        status: 'success',
        code: 'LOGIN_SUCCESS',
        message: 'Authentication successful',
        userId: validationResult.userId,
        user: validationResult.user,
        token,
      };
    } catch (error) {
      console.error('JWT authentication error:', error);
      return {
        success: false,
        status: 'error',
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      };
    }
  }

  async validate(token: string): Promise<ValidationResult> {
    try {
      const tokenUser = await this.tokenAuthService.authenticateTokenStrategy({
        token,
        tokenConfig: {},
      });

      return {
        valid: true,
        userId: tokenUser.userInfo.UUID,
        user: tokenUser,
        metadata: tokenUser.userInfo,
      };
    } catch (error) {
      return { valid: false };
    }
  }

  async revoke(token: string): Promise<void> {
    // JWTs are stateless, but we can blacklist if the service supports it
    if (this.tokenAuthService.blacklistToken) {
      await this.tokenAuthService.blacklistToken(token);
    }
  }
}

// Hybrid strategy that supports both cookies and JWT
export class HybridAuthStrategy implements AuthStrategy {
  constructor(
    private cookieStrategy: CookieSessionStrategy,
    private jwtStrategy: JWTStrategy,
    private preferCookies: boolean = true
  ) {}

  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    if (this.preferCookies) {
      const cookieResult = await this.cookieStrategy.authenticate(credentials);
      // Also generate JWT for backward compatibility
      if (cookieResult.success && cookieResult.userId) {
        const jwtResult = await this.jwtStrategy.authenticate(credentials);
        return {
          ...cookieResult,
          token: jwtResult.token,
        };
      }
      return cookieResult;
    } else {
      return this.jwtStrategy.authenticate(credentials);
    }
  }

  async validate(tokenOrSessionId: string): Promise<ValidationResult> {
    // Check if it's a JWT (contains dots) or session ID
    if (tokenOrSessionId.includes('.')) {
      return this.jwtStrategy.validate(tokenOrSessionId);
    } else {
      return this.cookieStrategy.validate(tokenOrSessionId);
    }
  }

  async revoke(tokenOrSessionId: string): Promise<void> {
    if (tokenOrSessionId.includes('.')) {
      await this.jwtStrategy.revoke(tokenOrSessionId);
    } else {
      await this.cookieStrategy.revoke(tokenOrSessionId);
    }
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    return this.cookieStrategy.refresh(refreshToken);
  }
}

// Loader generators for DI
export const cookieStrategyLDEGen = (): LoadDictElement<GetInstanceType<typeof CookieSessionStrategy>> => ({
  constructible: CookieSessionStrategy,
  destructureDeps: true,
  locateDeps: {
    sessionService: 'sessionService',
    userValidator: 'authService', // Assumes authService has a validate method
  },
  before: async ({ deps }) => {
    // Return array for positional constructor arguments
    return [deps.sessionService, deps.userValidator];
  }
});

export const jwtStrategyLDEGen = (): LoadDictElement<GetInstanceType<typeof JWTStrategy>> => ({
  constructible: JWTStrategy,
  destructureDeps: true,
  locateDeps: {
    tokenAuthService: 'tokenAuthService',
    userValidator: 'authService',
  },
  before: async ({ deps }) => {
    // Return array for positional constructor arguments
    return [deps.tokenAuthService, deps.userValidator];
  }
});

export const hybridStrategyLDEGen = (preferCookies: boolean = true): LoadDictElement<GetInstanceType<typeof HybridAuthStrategy>> => ({
  constructible: HybridAuthStrategy,
  destructureDeps: true,
  locateDeps: {
    cookieStrategy: 'cookieStrategy',
    jwtStrategy: 'jwtStrategy',
  },
  before: async ({ deps }) => {
    // Return array for positional constructor arguments
    return [deps.cookieStrategy, deps.jwtStrategy, preferCookies];
  }
});